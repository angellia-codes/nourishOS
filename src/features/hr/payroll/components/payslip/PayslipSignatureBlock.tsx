import type { Payslip } from '@/types'

/**
 * §10 — `Received by,` with an employee and a company signatory line.
 *
 * Ruled lines to sign by hand, matching the source Excel. Deliberately NOT the
 * SignaturePad canvas Appraisal v2 uses: a payslip is printed and handed over,
 * and §1 puts employee self-service out of scope, so there is no on-screen
 * signer to capture.
 */
export function PayslipSignatureBlock({ payslip }: { payslip: Payslip }) {
  return (
    <footer className="mt-10">
      <div className="flex flex-wrap justify-between gap-8">
        <SignatureLine caption="Received by," name={payslip.fullName} />
        <SignatureLine caption="Approved by," name="Nourish Group Indonesia" />
      </div>

      {payslip.statutoryOverrideReason && (
        // §6.4/§12 — an audited bypass leaves a trace on the artifact itself,
        // not only in the audit log.
        <p className="mt-8 border-t border-border pt-2 text-xs text-muted-foreground">
          Statutory note: {payslip.statutoryOverrideReason}
        </p>
      )}
    </footer>
  )
}

function SignatureLine({ caption, name }: { caption: string; name: string }) {
  return (
    <div className="min-w-48">
      <p className="text-sm">{caption}</p>
      <div className="mt-14 w-56 border-t border-foreground" />
      <p className="mt-1 text-sm font-medium">{name}</p>
    </div>
  )
}
