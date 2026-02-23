import { Metadata } from "next";
import { verifyCertificate } from "@/lib/services/certificate.service";

interface VerifyPageProps {
  params: Promise<{ issueNumber: string }>;
}

export async function generateMetadata({
  params,
}: VerifyPageProps): Promise<Metadata> {
  const { issueNumber } = await params;
  return {
    title: `Verify Certificate ${issueNumber} | MEDICHIPS-LINK`,
    description: "Verify the authenticity of a MEDICHIPS-LINK certificate",
  };
}

export default async function VerifyCertificatePage({
  params,
}: VerifyPageProps) {
  const { issueNumber } = await params;

  let result: Awaited<ReturnType<typeof verifyCertificate>>;
  let error: string | null = null;

  try {
    result = await verifyCertificate(issueNumber);
  } catch {
    error = "An error occurred while verifying the certificate.";
    result = { valid: false, reason: error };
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            MEDICHIPS-LINK
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificate Verification
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Status Banner */}
          {result.valid ? (
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Valid Certificate
                </p>
                <p className="text-xs text-emerald-600">
                  This certificate is authentic and in good standing.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {result.revoked
                    ? "Certificate Revoked"
                    : result.expired
                      ? "Certificate Expired"
                      : "Invalid Certificate"}
                </p>
                <p className="text-xs text-red-600">
                  {result.revoked
                    ? "This certificate has been revoked."
                    : result.expired
                      ? "This certificate has expired."
                      : error ?? result.reason ?? "Certificate could not be verified."}
                </p>
              </div>
            </div>
          )}

          {/* Certificate Details */}
          {"issueNumber" in result && result.issueNumber ? (
            <div className="px-6 py-5 space-y-4">
              <DetailRow
                label="Issue Number"
                value={result.issueNumber}
              />
              <DetailRow
                label="Holder"
                value={result.holderName ?? "-"}
              />
              <DetailRow
                label="Course"
                value={result.courseName ?? "-"}
              />
              <DetailRow
                label="Issued"
                value={
                  result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "-"
                }
              />
              {result.expiresAt && (
                <DetailRow
                  label="Expires"
                  value={new Date(result.expiresAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                />
              )}

              {/* Revocation Notice */}
              {result.revoked && result.revokedAt && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">
                    Revocation Notice
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Revoked on{" "}
                    {new Date(result.revokedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {result.revokedReason && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {result.revokedReason}
                    </p>
                  )}
                </div>
              )}

              {/* Verification Hash */}
              {result.verificationHash && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Verification Hash</p>
                  <p className="text-xs text-gray-500 font-mono break-all mt-1">
                    {result.verificationHash}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500">
                No certificate found with issue number{" "}
                <span className="font-mono font-medium">{issueNumber}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Verified by MEDICHIPS-LINK Certificate Authority
        </p>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">
        {value}
      </span>
    </div>
  );
}
