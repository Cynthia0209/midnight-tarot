import type { Metadata } from "next";
import { LegalPage, LegalSection, SupportAddress, supportEmail } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with a Midnight Tarot reading or privacy request.",
};

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="A human point of contact"
      title="Support"
      intro="For reading, privacy, or technical questions, send one clear message and we will trace what happened without asking for sensitive personal details."
    >
      <LegalSection title="Contact">
        <p>{supportEmail ? <>Email <SupportAddress />. We aim to reply within three business days.</> : <>A direct support email will be published here once configured.</>}</p>
      </LegalSection>

      <LegalSection title="For reading or access help">
        <p>Include what you were trying to do, the approximate time of the issue, your browser and device, and the reading link if you still have it. Do not send passwords, API keys, or sensitive details from your question.</p>
      </LegalSection>

      <LegalSection title="Browser storage">
        <p>Your private archive and preferences are stored in the browser you use. Clearing site data or switching browsers can remove local history, so save or share any reading you want to keep.</p>
      </LegalSection>

      <LegalSection title="Safety">
        <p>Midnight Tarot cannot provide medical, legal, financial, crisis, or emergency help. If you or someone else may be in immediate danger, contact local emergency services or an appropriate crisis service now.</p>
      </LegalSection>
    </LegalPage>
  );
}
