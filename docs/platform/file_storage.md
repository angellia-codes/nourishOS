# NourishOS File Storage Service

Version: 1.0
Module: Shared Services - File Storage

---

# 1. Overview

The File Storage Service is the centralized platform responsible for managing all files uploaded to NourishOS.

Instead of each module handling uploads independently, all files are stored, secured, and managed through this shared service.

Business modules only store references to files, while the files themselves reside in Firebase Cloud Storage.

---

# 2. Objectives

- Centralize file management
- Secure file access
- Support versioning
- Reduce duplicated uploads
- Improve scalability
- Enable future integrations
- Support audit and compliance

---

# 3. Supported Modules

```text
HR

Operations

Finance

Documents

Communications

Settings

Dashboard

Future Modules
```

Examples

- Employee photos
- Contracts
- SOP PDFs
- Training documents
- Incident images
- Expense receipts
- Work order photos
- Equipment manuals
- Company logos

---

# 4. Supported File Types

## Documents

- PDF
- DOCX
- XLSX
- PPTX
- TXT
- CSV

---

## Images

- JPG
- JPEG
- PNG
- WEBP

---

## Future

- MP4
- MOV
- MP3
- WAV
- SVG
- SCORM packages

Unsupported file types are rejected.

---

# 5. Storage Architecture

```text
React App

↓

Firebase Authentication

↓

Cloud Function

↓

Firebase Cloud Storage

↓

Firestore Metadata
```

The application retrieves metadata from Firestore and file content from Cloud Storage.

---

# 6. Folder Structure

```text
/company
    /branding

/employees
    /photos
    /contracts
    /documents
    /training

/finance
    /expenses
    /payments
    /budgets

/operations
    /opening-checklists
    /closing-checklists
    /daily-reports
    /incident-reports
    /work-orders
    /maintenance

/documents
    /sops
    /policies
    /templates
    /training

/communications
    /announcements
    /attachments

/system
    /avatars
    /temporary
    /exports
    /imports

/archive
```

---

# 7. File Metadata

Each uploaded file stores:

- File ID
- File Name
- Original Name
- File Type
- MIME Type
- File Size
- Storage Path
- Download URL (Generated)
- Module
- Resource Type
- Resource ID
- Uploaded By
- Uploaded At
- Version
- Status
- Checksum (Future)

---

# 8. File Lifecycle

```text
Upload

↓

Validation

↓

Virus Scan (Future)

↓

Storage

↓

Metadata Saved

↓

Available

↓

Archived

↓

Deleted (Soft Delete)

↓

Permanent Deletion (Retention Policy)
```

---

# 9. Upload Process

```text
User Upload

↓

Authentication

↓

Permission Check

↓

File Validation

↓

Upload to Cloud Storage

↓

Save Metadata

↓

Audit Log

↓

Notification (Optional)
```

---

# 10. Version Control

Supported for:

- SOPs
- Policies
- Contracts
- Templates
- Manuals

Each version records:

- Version Number
- Upload Date
- Uploaded By
- Change Summary
- Current Version Flag

Older versions remain read-only.

---

# 11. File Preview

Supported previews

- PDF
- Images
- Text files

Future

- Office documents
- Video streaming
- Audio playback

---

# 12. File Download

Features

- Permission validation
- Download tracking
- Secure URLs
- Temporary signed URLs (Future)

---

# 13. File Sharing

Internal sharing only.

Supported scopes

- Individual
- Department
- Outlet
- Company-wide

External sharing is disabled by default.

---

# 14. File Validation

Maximum file sizes (recommended)

| Type             | Max Size |
| ---------------- | -------: |
| Image            |    10 MB |
| PDF              |    25 MB |
| Office Documents |    25 MB |
| Video (Future)   |   500 MB |

Validation checks:

- File extension
- MIME type
- Size
- Duplicate detection (Future)

---

# 15. Firestore Collections

```text
files             (shipped — the only collection written today)

fileVersions      (declared in collections.ts, not yet written)

fileShares        (declared in collections.ts, not yet written)

fileDownloads     (planned — not in collections.ts)

fileCategories    (planned — not in collections.ts)

storageSettings   (planned — not in collections.ts)
```

Business modules reference `fileId` rather than storing file details directly.

---

# 16. Cloud Functions

Shipped:

```text
createFileMetadata()   (registers an uploaded file's metadata; the binary goes to Cloud Storage directly)

deleteFile()           (soft delete)
```

Planned:

```text
archiveFile()

restoreFile()

createFileVersion()

generateDownloadUrl()

recordDownload()

cleanupTemporaryFiles()
```

---

# 17. Search Integration

Indexed fields:

- File Name
- Original Name
- Module
- Resource Type
- Tags
- Uploaded By
- Upload Date

Search results link back to the owning resource.

---

# 18. Dashboard Integration

Widgets

- Recent Uploads
- Storage Usage
- Largest Files
- Expiring Documents
- Recently Updated Files

---

# 19. RBAC

Permissions are enforced using Firebase Authentication and RBAC.

| Action   | Employee | Leader  | Manager |   GM    | Director | Super Admin |
| -------- | :------: | :-----: | :-----: | :-----: | :------: | :---------: |
| Upload   | Limited  |   ✅    |   ✅    |   ✅    |    ✅    |     ✅      |
| Download | Limited  |   ✅    |   ✅    |   ✅    |    ✅    |     ✅      |
| Delete   |    ❌    | Limited | Limited |   ✅    |    ✅    |     ✅      |
| Restore  |    ❌    |   ❌    |   ❌    | Limited |    ✅    |     ✅      |
| Archive  |    ❌    |   ❌    | Limited |   ✅    |    ✅    |     ✅      |

Permissions are further restricted by department, outlet, and owning resource.

> **Shipped divergence:** today `createFileMetadata` requires only an active user, and `deleteFile` allows the file's **owner** (`createdBy`) to soft-delete their own file, with override for superAdmin/director/generalManager — looser than the matrix above. If the stricter matrix is still intended, tighten `functions/src/shared/fileStorage/deleteFile.ts`; until then the matrix is the target model.

---

# 20. Security

- Firebase Authentication required.
- RBAC validation before every operation.
- Files stored in private Cloud Storage buckets.
- Cloud Storage Security Rules enforce access.
- Download URLs should be short-lived when generated.
- Sensitive files are never publicly accessible.

---

# 21. Audit Logging

Record:

- Upload
- Download
- Preview
- Archive
- Restore
- Delete
- Version creation
- Permission changes

Each record includes:

- User
- Timestamp
- File ID
- Action
- Resource

---

# 22. Performance Targets

- Upload initiation ≤ 500 ms
- Progress indicator for all uploads
- Resumable uploads for large files
- Metadata retrieval ≤ 1 second
- Download authorization ≤ 500 ms

---

# 23. Storage Monitoring

Track:

- Total storage usage
- Usage by module
- Usage by outlet
- Largest files
- Most downloaded files
- Storage growth trends

Alerts

- Storage threshold reached
- Upload failures
- Large file uploads

---

# 24. Retention Policy

Recommended defaults

| Resource           | Retention |
| ------------------ | --------- |
| Employee Documents | 5 Years   |
| Contracts          | 7 Years   |
| Finance Documents  | 7 Years   |
| SOP Versions       | Permanent |
| Incident Photos    | 3 Years   |
| Temporary Files    | 30 Days   |

Soft-deleted files remain recoverable until retention expires.

---

# 25. Future Enhancements

## Security

- Malware scanning
- Digital signatures
- Watermarking
- Encryption keys per file
- Legal hold

## Productivity

- Drag-and-drop uploads
- Batch uploads
- Folder management
- File favorites
- Offline upload queue

## AI

- OCR for scanned documents
- Automatic tagging
- Image recognition
- Duplicate detection
- AI-generated summaries

---

# 26. Acceptance Criteria

The File Storage Service is complete when:

- All modules store files through the shared service.
- Metadata is maintained in Firestore.
- Files are securely stored in Firebase Cloud Storage.
- Version-controlled resources support multiple revisions.
- RBAC controls upload, download, and deletion.
- Audit logs record all file operations.
- Search indexes file metadata.
- Storage usage can be monitored through dashboards.
- The service is responsive across desktop, tablet, and mobile devices.
