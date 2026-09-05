import type { Metadata } from "next";
import { LegalPage, LegalSection, SupportAddress } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Midnight Tarot collects, uses, stores, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your private space"
      title="Privacy Policy"
      intro="Your questions may be personal. This policy explains what the service keeps, what it sends to its providers, and what remains in your browser."
    >
      <LegalSection title="1. Who operates this service">
        <p>Midnight Tarot is an independently operated website offering AI-assisted tarot readings for reflection and entertainment. In this policy, “we,” “our,” and “the service” refer to Midnight Tarot.</p>
      </LegalSection>

      <LegalSection title="2. Information we process">
        <p>When you use the service, we may process the question and optional context you provide, the spread and cards you select, the reading and follow-up questions generated from them, your chosen language, timestamps, and an anonymous browser credential used to keep your readings connected to the same browser.</p>
        <p>We also record limited product events such as whether a reading or follow-up was started or completed. These events do not contain your question, context, card names, or reading text.</p>
      </LegalSection>

      <LegalSection title="3. AI processing">
        <p>Your question, optional context, selected cards, and the instructions required to create a reading are sent to our AI provider, DeepSeek. This processing is necessary to generate the reading you request. Do not enter information that you do not want processed by an AI service, including sensitive identifying, medical, financial, or legal details.</p>
      </LegalSection>

      <LegalSection title="4. Storage and service providers">
        <p>Reading records, follow-ups, and limited analytics are stored with Supabase. The website may be hosted by a cloud hosting provider. These providers process information only as needed to operate, secure, and maintain the service.</p>
        <p>Your browser also stores a private archive, preferences, session progress, and the anonymous credential that connects this browser to cloud records. Clearing browser storage or switching browsers can remove local history.</p>
      </LegalSection>

      <LegalSection title="5. Sharing and public links">
        <p>We do not sell personal information. A reading is accessible to anyone who receives its unique share link. Share links are designed to be difficult to guess and are not intended for search-engine indexing, but you should only share them with people you trust.</p>
      </LegalSection>

      <LegalSection title="6. Retention and deletion">
        <p>We keep cloud reading and follow-up records while they are needed to provide the archive, sharing, abuse prevention, and service operations. Removing a reading through the available deletion controls requests removal of its associated cloud record. Some security records may be retained where required for legal compliance.</p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <p>You may avoid providing optional context, delete readings from your archive, clear local browser data, and ask us to access, correct, or delete information associated with your browser credential where applicable. Legal rights vary by location and may include objection, restriction, portability, or a complaint to a data-protection authority.</p>
      </LegalSection>

      <LegalSection title="8. Security and children">
        <p>We use access controls, server-side credentials, and rate limits. No online service can guarantee absolute security. Midnight Tarot is not directed to children under 13.</p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>Questions or privacy requests can be sent to <SupportAddress />.</p>
      </LegalSection>
    </LegalPage>
  );
}
