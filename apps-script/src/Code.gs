/**
 * NourishOS Apps Script backend — single-file layout (Code.gs is the
 * conventional entry-point name Apps Script expects). Sectioned in
 * dependency order: schema -> setup -> store -> errors -> audit -> auth ->
 * files -> api. See apps-script/README.md for deploy steps.
 */

// ============================================================================
// Schema
// ============================================================================
/**
 * Collection names, mirrored by hand from functions/src/lib/collections.ts
 * and src/constants/collections.ts (same intentional-duplication convention
 * CLAUDE.md already documents for those two files — this is a third copy).
 * Every collection is one sheet tab, row shape: id | createdAt | updatedAt | json.
 * ponytail: no per-collection columns — filters/sorts parse `json` in memory.
 * Ceiling: fine up to a few thousand rows per tab; revisit (real columns +
 * TextFinder-backed lookups) if any tab's row count starts making list calls
 * visibly slow.
 */
var COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  APPRAISAL_TEMPLATES: 'appraisalTemplates',
  APPRAISALS: 'appraisals',
  EMPLOYEES: 'employees',
  EMPLOYEE_ACTIVITIES: 'employeeActivities',
  APPROVAL_REQUESTS: 'approvalRequests',
  APPROVAL_STEPS: 'approvalSteps',
  APPROVAL_HISTORY: 'approvalHistory',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  FILES: 'files',
  CHECKPOINTS: 'checkpoints',
  PATROL_LOGS: 'patrolLogs',
  DAILY_REPORTS: 'dailyReports',
  INCIDENT_REPORTS: 'incidentReports',
  LOST_FOUND_ITEMS: 'lostFoundItems',
  CALENDAR_EVENTS: 'calendarEvents',
}

var ROW_HEADERS = ['id', 'createdAt', 'updatedAt', 'json']

// ============================================================================
// Setup — one-time provisioning
// ============================================================================
/**
 * Run `setupSpreadsheetAndDrive` once from the Apps Script editor (select it
 * in the function dropdown, click Run) after `clasp push`. It creates the
 * spreadsheet + Drive root folder and stores their IDs in Script Properties
 * so the rest of the code never hardcodes them.
 */
function setupSpreadsheetAndDrive() {
  var props = PropertiesService.getScriptProperties()

  if (props.getProperty('SPREADSHEET_ID')) {
    throw new Error(
      'Already set up (SPREADSHEET_ID is set) — this would create a duplicate ' +
        'spreadsheet + Drive folder and orphan the existing one. Clear ' +
        'SPREADSHEET_ID/DRIVE_ROOT_FOLDER_ID in Script Properties first if you ' +
        'really want to re-provision.',
    )
  }

  var ss = SpreadsheetApp.create('NourishOS Data')
  var defaultSheet = ss.getSheets()[0]

  Object.keys(COLLECTIONS).forEach(function (key) {
    var name = COLLECTIONS[key]
    var sheet = ss.insertSheet(name)
    sheet.getRange(1, 1, 1, ROW_HEADERS.length).setValues([ROW_HEADERS])
    sheet.setFrozenRows(1)
  })
  // Roles tab: seed structure only — actual role->permissions rows must be
  // filled in by hand (they were live Firestore data, not repo constants).
  // Row shape matches every other tab: id = role name (e.g. "hrManager"),
  // json = '{"permissions":["employees.read", ...]}'.

  ss.deleteSheet(defaultSheet)
  props.setProperty('SPREADSHEET_ID', ss.getId())

  var root = DriveApp.createFolder('NourishOS Files')
  props.setProperty('DRIVE_ROOT_FOLDER_ID', root.getId())

  if (!props.getProperty('SESSION_SECRET')) {
    props.setProperty('SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid())
  }

  Logger.log('Spreadsheet: ' + ss.getUrl())
  Logger.log('Drive root: ' + root.getUrl())
  Logger.log('Now set ANTHROPIC_API_KEY yourself: Project Settings > Script Properties.')
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('Run setupSpreadsheetAndDrive first.')
  return SpreadsheetApp.openById(id)
}

function getDriveRoot_() {
  var id = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID')
  if (!id) throw new Error('Run setupSpreadsheetAndDrive first.')
  return DriveApp.getFolderById(id)
}

// ============================================================================
// Store — generic per-collection CRUD over id|createdAt|updatedAt|json rows
// ============================================================================
// Row 1 is headers; row index in Sheets is 1-based and includes the header
// row, so data row N is sheet row N+1.

function getSheet_(collection) {
  var sheet = getSpreadsheet_().getSheetByName(collection)
  if (!sheet) throw new Error('Unknown collection: ' + collection)
  return sheet
}

function rowToDoc_(row) {
  var fields = {}
  if (row[3]) {
    try {
      fields = JSON.parse(row[3])
    } catch (error) {
      console.error('Skipping row with malformed json, id=' + row[0], error)
    }
  }
  fields.id = row[0]
  fields.createdAt = row[1]
  fields.updatedAt = row[2]
  return fields
}

function listRows_(collection) {
  var sheet = getSheet_(collection)
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return []
  var values = sheet.getRange(2, 1, lastRow - 1, ROW_HEADERS.length).getValues()
  return values.filter(function (row) { return row[0] }).map(rowToDoc_)
}

// Returns {doc, sheetRow} where sheetRow is the 1-based Sheets row (for update/delete), or null.
function findRowById_(collection, id) {
  var sheet = getSheet_(collection)
  var lastRow = sheet.getLastRow()
  if (lastRow < 2) return null
  var values = sheet.getRange(2, 1, lastRow - 1, ROW_HEADERS.length).getValues()
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === id) {
      return { doc: rowToDoc_(values[i]), sheetRow: i + 2 }
    }
  }
  return null
}

function getDoc_(collection, id) {
  var found = findRowById_(collection, id)
  return found ? found.doc : null
}

function createDoc_(collection, fields, idOverride) {
  var sheet = getSheet_(collection)
  var id = idOverride || Utilities.getUuid()
  var now = new Date().toISOString()
  var body = Object.assign({}, fields)
  delete body.id
  delete body.createdAt
  delete body.updatedAt
  sheet.appendRow([id, now, now, JSON.stringify(body)])
  return rowToDoc_([id, now, now, JSON.stringify(body)])
}

function updateDoc_(collection, id, patch) {
  var sheet = getSheet_(collection)
  var found = findRowById_(collection, id)
  if (!found) throw new Error('Not found: ' + collection + '/' + id)
  var merged = Object.assign({}, found.doc, patch)
  var now = new Date().toISOString()
  var createdAt = found.doc.createdAt
  delete merged.id
  delete merged.createdAt
  delete merged.updatedAt
  sheet.getRange(found.sheetRow, 2, 1, 3).setValues([[createdAt, now, JSON.stringify(merged)]])
  merged.id = id
  merged.createdAt = createdAt
  merged.updatedAt = now
  return merged
}

// Approval-engine style: read-recheck-write under a script-wide mutex.
// mutator receives the current doc (or null) and returns the next doc;
// throwing inside mutator aborts without writing (mirrors a Firestore
// transaction's abort-on-precondition-fail behavior).
function withLockedDoc_(collection, id, mutator) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    var current = getDoc_(collection, id)
    var next = mutator(current)
    return updateDoc_(collection, id, next)
  } finally {
    lock.releaseLock()
  }
}

// ============================================================================
// Errors — mirrors functions/src/lib/errors.ts AppError + handleError
// ============================================================================

function AppError_(code, message, details) {
  var err = new Error(message)
  err.name = 'AppError'
  err.code = code
  err.details = details
  return err
}

function successEnvelope_(data, message) {
  return { success: true, message: message || 'OK', data: data }
}

// Apps Script Web Apps always answer HTTP 200 (ContentService has no status-
// code control) — the {success:false, code, message} body is how the client
// distinguishes failure. callFunction.ts on the frontend checks this shape.
function errorEnvelope_(error) {
  if (error && error.name === 'AppError') {
    return { success: false, code: error.code, message: error.message, details: error.details || null }
  }
  console.error('Unhandled error', error && error.stack ? error.stack : error)
  return { success: false, code: 'internal', message: 'Something went wrong. Please try again.' }
}

// ============================================================================
// Audit — mirrors functions/src/lib/audit.ts
// ============================================================================
// Append-only; auditLogs has no update path exposed via the API section below.
function recordAuditEvent_(input) {
  try {
    createDoc_(COLLECTIONS.AUDIT_LOGS, {
      timestamp: new Date().toISOString(),
      eventType: input.eventType,
      category: input.category,
      module: input.module,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      userId: input.user.uid,
      userName: input.user.displayName,
      userRole: input.user.roleId,
      departmentId: input.user.departmentId || null,
      outletId: input.user.outletId || null,
      severity: input.severity || 'informational',
      previousValues: input.previousValues || null,
      newValues: input.newValues || null,
      metadata: input.metadata || null,
    })
  } catch (error) {
    console.error('Failed to record audit event ' + input.eventType + ' for ' + input.resourceType + '/' + input.resourceId, error)
  }
}

// ============================================================================
// Auth — replaces Firebase Auth + custom claims
// ============================================================================
// Client keeps using Google Identity Services to get a Google access token
// (same Google Sign-In button as today, AUTHENTICATION.md §3), then trades
// it here for our own signed session token — Apps Script has no
// session/cookie primitive of its own.

// Client gets this via Google Identity Services' OAuth2 token client
// (scope: openid email profile) — simpler than the id_token/One-Tap flow
// and just as verifiable: the userinfo endpoint only answers for a token
// Google itself issued and hasn't expired/revoked.
function verifyGoogleAccessToken_(accessToken) {
  var resp = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true,
  })
  if (resp.getResponseCode() !== 200) throw AppError_('unauthenticated', 'Invalid Google access token.')
  var payload = JSON.parse(resp.getContentText())
  if (!payload.email || payload.email_verified !== true) {
    throw AppError_('unauthenticated', 'Google account email not verified.')
  }
  return payload
}

function findOrCreateUserByEmail_(email, name) {
  var all = listRows_(COLLECTIONS.USERS)
  var existing = all.filter(function (u) { return u.email === email })[0]
  if (existing) return existing
  // New sign-ins default to 'staff' + 'pending' status, same as today's
  // syncUserClaims-adjacent onboarding flow — an admin must activate + assign
  // a real role before the account can do anything (requireActiveUser_ below).
  // uid mirrors the doc id (matches src/types/rbac.types.ts's UserProfile.uid).
  var uid = Utilities.getUuid()
  return createDoc_(
    COLLECTIONS.USERS,
    {
      uid: uid,
      email: email,
      displayName: name || email,
      roleId: ROLES_.STAFF,
      status: 'pending',
      departmentId: null,
      outletId: null,
    },
    uid,
  )
}

function issueSessionToken_(userId) {
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET')
  var payload = { uid: userId, exp: Date.now() + 12 * 60 * 60 * 1000 }
  var payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload))
  var sig = Utilities.computeHmacSha256Signature(payloadB64, secret)
  var sigB64 = Utilities.base64EncodeWebSafe(sig)
  return payloadB64 + '.' + sigB64
}

function verifySessionToken_(token) {
  if (!token || token.indexOf('.') === -1) throw AppError_('unauthenticated', 'Missing session token.')
  var parts = token.split('.')
  var payloadB64 = parts[0]
  var sigB64 = parts[1]
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET')
  var expectedSig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, secret))
  if (expectedSig !== sigB64) throw AppError_('unauthenticated', 'Invalid session token.')
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString())
  if (payload.exp < Date.now()) throw AppError_('unauthenticated', 'Session expired.')
  return payload.uid
}

// Mirrors requireActiveUser (functions/src/lib/rbac.ts): resolves the live
// user doc every call, never trusts a cached role from the token itself.
function requireActiveUser_(sessionToken) {
  var uid = verifySessionToken_(sessionToken)
  var user = getDoc_(COLLECTIONS.USERS, uid)
  if (!user) throw AppError_('unauthenticated', 'User not found.')
  if (user.status !== 'active') throw AppError_('permission-denied', 'Account is ' + user.status + '.')
  return user
}

// Mirrors requirePermission (functions/src/lib/rbac.ts).
function requirePermission_(user, permission) {
  var role = getDoc_(COLLECTIONS.ROLES, user.roleId)
  var perms = (role && role.permissions) || []
  if (perms.indexOf(permission) === -1) {
    throw AppError_('permission-denied', 'Missing permission: ' + permission)
  }
}

var ROLES_ = { STAFF: 'staff' }

// registerActions_/ACTIONS_ must exist before the Files/Api sections below
// call registerActions_ at top level — Apps Script runs top-level statements
// in file order every execution, so this can't sit down by doPost/doGet
// where it reads (var initializers aren't hoisted with their value, only
// declared; this bit us as "Cannot read properties of undefined (reading
// 'files.upload')" until moved here).
var ACTIONS_ = {}

function registerActions_(map) {
  Object.keys(map).forEach(function (name) {
    if (ACTIONS_[name]) throw new Error('Duplicate action: ' + name)
    ACTIONS_[name] = map[name]
  })
}

// ============================================================================
// Files — replaces Firebase Storage; direct port of
// functions/src/shared/fileStorage/{validation,createFileMetadata,deleteFile}.ts
// ============================================================================
var IMAGE_EXTENSIONS_ = ['jpg', 'jpeg', 'png', 'webp']
var DOCUMENT_EXTENSIONS_ = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv']
var MAX_SIZE_BYTES_ = { image: 10 * 1024 * 1024, document: 25 * 1024 * 1024 }
var FILE_OVERRIDE_ROLES_ = ['superAdmin', 'director', 'generalManager']

function validateFile_(fileName, fileSizeBytes) {
  var extension = (fileName.split('.').pop() || '').toLowerCase()

  if (IMAGE_EXTENSIONS_.indexOf(extension) !== -1) {
    if (fileSizeBytes > MAX_SIZE_BYTES_.image) {
      throw AppError_('invalid-argument', 'Image files must be under ' + MAX_SIZE_BYTES_.image / 1024 / 1024 + 'MB.')
    }
    return extension
  }
  if (DOCUMENT_EXTENSIONS_.indexOf(extension) !== -1) {
    if (fileSizeBytes > MAX_SIZE_BYTES_.document) {
      throw AppError_(
        'invalid-argument',
        'Document files must be under ' + MAX_SIZE_BYTES_.document / 1024 / 1024 + 'MB.',
      )
    }
    return extension
  }
  throw AppError_('invalid-argument', 'Unsupported file type: .' + (extension || 'unknown'))
}

// Per file_storage.md §6 folder structure: /{module}/{resourceType}/{resourceId}/{file}
// — same shape, on Drive folders instead of a Storage path string.
function getOrCreateSubfolder_(parent, name) {
  var existing = parent.getFoldersByName(name)
  return existing.hasNext() ? existing.next() : parent.createFolder(name)
}

function getOrCreateResourceFolder_(module, resourceType, resourceId) {
  var root = getDriveRoot_()
  var moduleFolder = getOrCreateSubfolder_(root, module)
  var typeFolder = getOrCreateSubfolder_(moduleFolder, resourceType)
  return getOrCreateSubfolder_(typeFolder, resourceId)
}

registerActions_({
  'files.upload': {
    handler: function (payload, user) {
      if (
        !payload.base64 ||
        !payload.fileName ||
        !payload.mimeType ||
        typeof payload.fileSizeBytes !== 'number' ||
        !payload.module ||
        !payload.resourceType ||
        !payload.resourceId
      ) {
        throw AppError_(
          'invalid-argument',
          'base64, fileName, mimeType, fileSizeBytes, module, resourceType, and resourceId are required.',
        )
      }

      var fileType = validateFile_(payload.fileName, payload.fileSizeBytes)
      var sanitizedName = payload.fileName.replace(/[^a-zA-Z0-9.\-_ ]/g, '_')

      var blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, sanitizedName)
      var folder = getOrCreateResourceFolder_(payload.module, payload.resourceType, payload.resourceId)
      var driveFile = folder.createFile(blob)
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

      var doc = createDoc_(COLLECTIONS.FILES, {
        fileName: sanitizedName,
        originalName: payload.fileName,
        fileType: fileType,
        mimeType: payload.mimeType,
        fileSizeBytes: payload.fileSizeBytes,
        storagePath: driveFile.getId(), // holds the Drive file ID, not a Storage path
        downloadUrl: driveFile.getUrl(),
        module: payload.module,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        version: 1,
        fileStatus: 'available',
        createdBy: user.uid,
        updatedBy: user.uid,
      })

      recordAuditEvent_({
        eventType: 'FileUploaded',
        category: 'Files',
        module: payload.module,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        action: 'upload',
        user: user,
        metadata: { fileId: doc.id, fileName: payload.fileName, fileSizeBytes: payload.fileSizeBytes },
      })

      return doc
    },
  },

  'files.delete': {
    handler: function (payload, user) {
      if (!payload.fileId) throw AppError_('invalid-argument', 'fileId is required.')

      var file = getDoc_(COLLECTIONS.FILES, payload.fileId)
      if (!file) throw AppError_('not-found', 'File not found.')

      var isOwner = file.createdBy === user.uid
      if (!isOwner && FILE_OVERRIDE_ROLES_.indexOf(user.roleId) === -1) {
        throw AppError_('permission-denied', 'You do not have permission to remove this file.')
      }

      // Soft delete only — the Drive file stays until a retention job (not
      // built yet, file_storage.md §24/§25) permanently removes it.
      updateDoc_(COLLECTIONS.FILES, payload.fileId, { fileStatus: 'deleted', updatedBy: user.uid })

      recordAuditEvent_({
        eventType: 'FileDeleted',
        category: 'Files',
        module: file.module,
        resourceType: file.resourceType,
        resourceId: file.resourceId,
        action: 'delete',
        user: user,
        metadata: { fileId: payload.fileId },
      })
    },
  },
})

// ============================================================================
// Api — doGet/doPost router. Mirrors callFunction('name', payload) 1:1: one
// action name, one JSON payload, one envelope back.
// (ACTIONS_/registerActions_ itself now lives up by the Auth section — see
// the comment there for why.)
// ============================================================================

// action: { public: true } skips requireActiveUser_ (only auth.loginWithGoogle today).
registerActions_({
  'auth.loginWithGoogle': {
    public: true,
    handler: function (payload) {
      // Mirrors Firebase Auth: signing in always succeeds — an inactive/
      // pending profile is a downstream app-access concern (auth.me below),
      // not a login failure, so the frontend can still show *why* access is
      // blocked instead of a generic error.
      var googlePayload = verifyGoogleAccessToken_(payload.accessToken)
      var user = findOrCreateUserByEmail_(googlePayload.email, googlePayload.name)
      return { sessionToken: issueSessionToken_(user.id), user: user }
    },
  },
  'auth.me': {
    authLevel: 'session',
    handler: function (_payload, user) {
      var role = getDoc_(COLLECTIONS.ROLES, user.roleId)
      var permissions = (role && role.permissions) || []
      return { user: Object.assign({}, user, { permissions: permissions }) }
    },
  },
  // Coarse generic reads — any active user can list/get any of the 18
  // collections. Per-module permission/scoping (department/outlet, own-
  // record-only, etc — the conditions firestore.rules used to encode) lands
  // action-by-action as each Cloud Function is ported in a later migration
  // phase; until then this is intentionally broader than the old rules were.
  'collection.list': {
    handler: function (payload) {
      return listRows_(payload.collection)
    },
  },
  'collection.get': {
    handler: function (payload) {
      return getDoc_(payload.collection, payload.id)
    },
  },
})

function doPost(e) {
  var body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return jsonOutput_(errorEnvelope_(AppError_('invalid-argument', 'Malformed JSON body.')))
  }
  return handleAction_(body.action, body.payload || {}, body.sessionToken)
}

function doGet(e) {
  var params = (e && e.parameter) || {}
  var payload = params.payload ? JSON.parse(params.payload) : {}
  return handleAction_(params.action, payload, params.sessionToken)
}

function handleAction_(actionName, payload, sessionToken) {
  var action = ACTIONS_[actionName]
  if (!action) {
    return jsonOutput_(errorEnvelope_(AppError_('not-found', 'Unknown action: ' + actionName)))
  }
  try {
    var user
    if (action.public) {
      user = null
    } else if (action.authLevel === 'session') {
      var uid = verifySessionToken_(sessionToken)
      user = getDoc_(COLLECTIONS.USERS, uid)
      if (!user) throw AppError_('unauthenticated', 'User not found.')
    } else {
      user = requireActiveUser_(sessionToken)
    }
    var data = action.handler(payload, user)
    return jsonOutput_(successEnvelope_(data))
  } catch (error) {
    return jsonOutput_(errorEnvelope_(error))
  }
}

function jsonOutput_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON)
}
