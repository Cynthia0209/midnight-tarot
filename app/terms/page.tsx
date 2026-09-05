import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, SupportAddress } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Midnight Tarot readings and follow-up questions.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The agreement"
      title="Terms of Service"
      intro="These terms describe what Midnight Tarot provides and the limits of a reflective AI-generated reading."
    >
      <LegalSection title="1. Accepting these terms">
        <p>By accessing or using Midnight Tarot, you agree to these Terms of Service and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.</p>
      </LegalSection>

      <LegalSection title="2. Nature of the service">
        <p>Midnight Tarot provides AI-assisted tarot readings for personal reflection, journaling, and entertainment. Readings are generated from your question, context, selected spread, and drawn cards. They are not factual predictions and do not guarantee any outcome.</p>
        <p>The service is not medical, mental-health, legal, financial, relationship, safety, or crisis advice. Do not use a reading as the sole basis for a significant decision. Contact a qualified professional or emergency service when appropriate.</p>
      </LegalSection>

      <LegalSection title="3. Eligibility and acceptable use">
        <p>You must be legally able to agree to these terms. You may not misuse the service, probe or bypass its security, automate abusive requests, resell access, interfere with other users, or use generated content for unlawful, deceptive, or harmful activity.</p>
      </LegalSection>

      <LegalSection title="4. Readings and follow-ups">
        <p>Readings and follow-up questions are currently available without charge. Reasonable technical rate limits may be used to protect the service from automated or abusive traffic. Availability and features may change, and continued access is not guaranteed.</p>
      </LegalSection>

      <LegalSection title="5. Availability and changes">
        <p>AI providers, hosting, and other dependencies can be delayed or unavailable. We may maintain, modify, suspend, or discontinue parts of the service.</p>
      </LegalSection>

      <LegalSection title="6. Intellectual property">
        <p>The Midnight Tarot brand, interface, original writing, card-back design, and software are protected by applicable intellectual-property laws. The historical Rider-Waite-Smith card artwork used by the service is sourced from public-domain material. You may keep and share a reading generated for your personal use, but you may not copy or republish the service itself.</p>
      </LegalSection>

      <LegalSection title="7. Disclaimers and liability">
        <p>The service is provided “as is” and “as available.” To the fullest extent permitted by law, we disclaim implied warranties and are not responsible for decisions, losses, or harm based on a reading, interruption, third-party service, or loss of browser data. Nothing in these terms limits rights or liability that cannot legally be excluded.</p>
      </LegalSection>

      <LegalSection title="8. Contact and changes to these terms">
        <p>Questions about these terms can be sent to <SupportAddress />. We may update these terms to reflect product, provider, or legal changes. The effective date at the top identifies the current version.</p>
      </LegalSection>
    </LegalPage>
  );
}
