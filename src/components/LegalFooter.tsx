import { useState } from 'react';

export function LegalFooter() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const TermsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Terms of Service</h2>
          <button onClick={() => setShowTerms(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-lg mb-2">1. Platform Purpose</h3>
            <p>MOCARDS is a loyalty card management platform designed exclusively for legitimate dental clinic partnerships and patient reward programs.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">2. Prohibited Uses</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Any illegal activities or fraudulent schemes</li>
              <li>Money laundering or financial crime</li>
              <li>Unauthorized access or system manipulation</li>
              <li>Violation of applicable healthcare or consumer protection laws</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">3. User Responsibilities</h3>
            <p>Users are solely responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ensuring compliance with all applicable laws and regulations</li>
              <li>Proper use of the platform for legitimate business purposes only</li>
              <li>Maintaining accurate and truthful information</li>
              <li>Protecting access credentials and preventing unauthorized use</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">4. Platform Limitations</h3>
            <p>This platform does NOT process payments, handle financial transactions, or provide financial services. All monetary transactions occur independently between clinics and patients.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">5. Developer Disclaimer</h3>
            <p className="bg-yellow-50 p-4 rounded border">
              <strong>IMPORTANT:</strong> This software was developed as a contracted technical service. The developer assumes no responsibility for how this platform is used after delivery. All liability for platform use, compliance, and operations rests solely with the platform owner and users.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">6. Termination</h3>
            <p>Access may be terminated immediately for any violation of these terms or suspicious activity.</p>
          </section>
        </div>
      </div>
    </div>
  );

  const PrivacyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Privacy Policy</h2>
          <button onClick={() => setShowPrivacy(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-lg mb-2">Data Collection</h3>
            <p>We collect only necessary information for loyalty card management including card numbers, clinic information, and usage records.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Data Usage</h3>
            <p>Information is used solely for platform functionality and legitimate business operations. No data is sold or shared with unauthorized parties.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Data Security</h3>
            <p>Reasonable security measures are implemented, but users acknowledge inherent risks in digital platforms.</p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Developer Liability</h3>
            <p className="bg-yellow-50 p-4 rounded border">
              The original developer provided technical services only and assumes no ongoing responsibility for data handling, security breaches, or privacy violations after project delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );

  const DisclaimerModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Legal Disclaimer</h2>
          <button onClick={() => setShowDisclaimer(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="font-bold text-red-800 mb-2">⚠️ IMPORTANT LEGAL NOTICE</h3>
            <p className="text-red-700">
              This platform was developed as a contracted technical service. The developer disclaims all liability for platform misuse, legal violations, or damages arising from use of this software.
            </p>
          </div>

          <section>
            <h3 className="font-semibold text-lg mb-2">Developer Limitation of Liability</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>The developer provided technical programming services only</li>
              <li>No ongoing relationship, support, or liability exists after project delivery</li>
              <li>The developer is not responsible for how the platform is used by others</li>
              <li>All liability for operations, compliance, and legal issues rests with the platform owner</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Platform Risks</h3>
            <p>Users acknowledge that:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Digital platforms carry inherent security and operational risks</li>
              <li>Users must ensure compliance with applicable laws</li>
              <li>No warranties are provided regarding fitness for purpose</li>
              <li>Use is at user's own risk</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Indemnification</h3>
            <p className="bg-blue-50 p-4 rounded border">
              By using this platform, users agree to indemnify and hold harmless the original developer from any claims, damages, or legal issues arising from platform use, misuse, or operation.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Contact for Legal Issues</h3>
            <p>For legal concerns or compliance questions, contact the platform owner, not the original developer.</p>
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <footer className="bg-gray-100 border-t mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              © 2024 MOCARDS Platform. For legitimate dental clinic use only.
            </div>

            <div className="flex space-x-6 text-sm">
              <button
                onClick={() => setShowTerms(true)}
                className="text-gray-600 hover:text-gray-900 underline"
              >
                Terms of Service
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-gray-600 hover:text-gray-900 underline"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setShowDisclaimer(true)}
                className="text-red-600 hover:text-red-800 underline font-medium"
              >
                Legal Disclaimer
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
            <p>⚠️ This platform is for card management only. No financial transactions are processed through this system.</p>
            <p className="mt-1">Platform developed as contracted technical service. Developer assumes no liability for platform use or misuse.</p>
          </div>
        </div>
      </footer>

      {showTerms && <TermsModal />}
      {showPrivacy && <PrivacyModal />}
      {showDisclaimer && <DisclaimerModal />}
    </>
  );
}