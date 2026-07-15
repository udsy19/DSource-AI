import {
  LegalLayout,
  Section,
  LegalList,
  Conspicuous,
  LegalLink,
} from "@/components/legal-page";

export const metadata = {
  title: "Terms of Service | DSource.AI",
  description:
    "The terms that govern your use of DSource.AI, including AI visualization tools, the materials marketplace, and the vendor portal.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 15, 2026" version="1.0">
      <Section number="1" title="Acceptance of these Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) are an electronic record
          under the Information Technology Act, 2000 and a binding agreement
          between you and DSource.AI (&quot;we&quot;, &quot;us&quot;),
          governing your use of dsource.ai and its related tools and services
          (the &quot;Platform&quot;). They do not require a physical or digital
          signature.
        </p>
        <p>
          You accept these Terms by checking the agreement box at signup, by
          clicking &quot;I agree&quot; where presented, or by using the
          Platform. If you do not agree, do not use the Platform. Our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> explains how we
          handle personal data and forms part of your relationship with us,
          though consent to data processing is obtained separately as required
          by law.
        </p>
      </Section>

      <Section number="2" title="Definitions">
        <LegalList
          items={[
            "“Input” — anything you submit to an AI feature, including uploaded photos, text prompts, and design parameters.",
            "“Output” — AI-generated content returned to you, such as design renders and material analyses.",
            "“User Content” — Inputs and any other content you submit to the Platform (e.g., contact messages, saved specs).",
            "“Vendor Content” — product listings, descriptions, specifications, images, image links, and catalog data submitted by Vendors.",
            "“User” — anyone who uses the Platform; “Vendor” — a User with a vendor account who submits Vendor Content.",
          ]}
        />
      </Section>

      <Section number="3" title="Eligibility and accounts">
        <LegalList
          items={[
            "You must be at least 18 years old and capable of entering a binding contract under the Indian Contract Act, 1872. The Platform is not offered to minors.",
            "You are responsible for your login credentials and for all activity under your account. Notify us immediately of any unauthorized use.",
            "You must provide a valid email address. One person or entity per account unless we agree otherwise in writing.",
            "We may refuse, suspend, or terminate registration at our discretion, including for suspected fraud, abuse, or legal risk.",
            "Vendor accounts are subject to the additional terms in Section 8. We may require verification before or after granting vendor capabilities and may revoke them at any time.",
          ]}
        />
      </Section>

      <Section number="4" title="The Platform">
        <p>
          The Platform provides AI-assisted interior-design tools (material
          detection from photos, design visualization), a catalog of
          building-material and furnishing products, spec-sheet building
          tools, and a vendor portal for suppliers to manage product listings.
        </p>
        <p>
          The Platform is under active development.{" "}
          <strong>
            Features may be added, modified, degraded, suspended, or removed at
            any time without liability
          </strong>
          , including AI models and third-party integrations we depend on.
          Some displayed features, metrics, figures, and documents are
          illustrative previews or samples of planned functionality and are
          not warranted to be real, accurate, or personalized — this includes,
          without limitation, indicative pricing figures, availability
          badges, dashboard analytics, and sample export documents.
        </p>
      </Section>

      <Section number="5" title="AI features: Inputs, Outputs, and ownership">
        <p>
          <strong>Your Inputs.</strong> You retain ownership of your Inputs. You
          grant us a non-exclusive, worldwide, royalty-free license to host,
          reproduce, process, adapt, and transmit Inputs — including
          processing them through third-party AI models — solely to operate,
          provide, secure, and improve the Platform. We do not use your Inputs
          or Outputs to train AI models without your separate opt-in consent.
        </p>
        <p>
          <strong>You warrant</strong> that you own or have all necessary
          rights to your Inputs; that Inputs do not violate any law or any
          third party&apos;s intellectual-property, privacy, or other rights;
          and that any identifiable person or private property shown in an
          uploaded photo is included with the necessary permission.
        </p>
        <p>
          <strong>Outputs.</strong> As between you and us, and subject to your
          compliance with these Terms, you own the Outputs generated from your
          Inputs. You grant us a non-exclusive, worldwide, royalty-free license
          to host, reproduce, and display Outputs to operate the Platform, and
          — only if you mark a render as public or submit it to a public
          gallery — to display it publicly with attribution. AI-output
          copyright law is unsettled in many jurisdictions; we make no warranty
          that Outputs are protectable or non-infringing, and you bear the risk
          of your use, including commercial use, of Outputs.
        </p>
        <Conspicuous>
          Outputs are probabilistic, machine-generated visualizations. They may
          be inaccurate, incomplete, or contain artifacts, and may not be
          unique — similar or identical outputs may be generated for other
          users. Outputs are conceptual only. They are not architectural,
          engineering, structural, electrical, code-compliance, or professional
          interior-design advice, are not measurements or quantity estimates,
          and may depict configurations that are physically impossible or
          non-compliant. You are solely responsible for verifying Outputs with
          licensed professionals before making purchase, construction, or
          design decisions.
        </Conspicuous>
        <p>
          AI features are provided by third-party model providers (currently
          Google&apos;s Gemini API). Your use of AI features must also comply
          with the applicable provider&apos;s prohibited-use policies. AI
          feature availability, quality, and limits depend on those providers
          and may change or be discontinued at any time.
        </p>
      </Section>

      <Section number="6" title="Catalog, product information, and pricing">
        <p>
          DSource.AI is an intermediary and discovery platform. Product
          listings and catalog data are Vendor Content or third-party
          information that we host; we are not the seller, manufacturer,
          importer, or agent of any listed product, we are not a party to any
          transaction between you and a supplier, and we do not verify
          products or listings unless expressly stated. Nothing on the
          Platform is an offer to sell by DSource.AI.
        </p>
        <LegalList
          items={[
            "Product names, images, specifications, colors, dimensions, availability indicators, and prices are supplied by vendors or third parties, are indicative only, and may be inaccurate, incomplete, out of date, or shown as placeholders. Currently displayed prices and availability badges are illustrative and are not offers or quotations.",
            "Rendered and photographed colors, textures, and finishes vary by display and may differ materially from the physical product. Natural materials (stone, wood, ceramics) vary batch to batch.",
            "Before purchasing or specifying any product, you must verify specifications, pricing, availability, and suitability directly with the supplier, including physical samples where relevant.",
            "Spec sheets and estimates generated on the Platform (including any tax, margin, or savings figures) are informational drafts using indicative values — they are not quotations, invoices, or financial or professional advice.",
            "Links and buttons may take you to external third-party websites we do not control and are not responsible for.",
          ]}
        />
        <p>
          Third-party product names, brand names, and trademarks appearing in
          listings belong to their respective owners, are used for product
          identification only, and do not imply any affiliation with or
          endorsement of or by DSource.AI.
        </p>
      </Section>

      <Section number="7" title="Fees and subscriptions">
        <p>
          The Platform is currently provided without charge.{" "}
          <strong>
            Paid plans, trials, and billing shown on the pricing page are
            forthcoming offerings and cannot yet be purchased;
          </strong>{" "}
          no payment is collected and no subscription is created today. When
          paid plans launch: fees, billing cycles, trial terms, renewal, and
          cancellation will be as stated at the point of purchase; we will give
          at least 30 days&apos; notice of price changes for existing
          subscribers; usage described as &quot;unlimited&quot; is subject to
          fair use and technical limits; and fees for consumed AI generations
          are non-refundable except where required by law or expressly stated.
        </p>
      </Section>

      <Section number="8" title="Vendor terms">
        <p>These additional terms apply to Vendors:</p>
        <LegalList
          items={[
            "You represent and warrant that: you own or are licensed to use all Vendor Content, including every image and every URL you link; listings are accurate, not misleading, and correspond to the actual nature, quality, and features of the product; products are genuine, lawful, and compliant with applicable Indian standards; and you hold all registrations required for your business (including GST where applicable).",
            "You grant DSource.AI a non-exclusive, worldwide, royalty-free, sublicensable license to host, reproduce, adapt, display, and distribute Vendor Content across the Platform — including processing Vendor Content through AI models and rendering vendor products within user-generated scenes and spec documents. This license survives termination for content already incorporated into user documents, caches, and backups.",
            "You must not link images or content you have no rights to use, upload data scraped from other marketplaces, or list products you are not authorized to supply.",
            "We may review, edit, reject, delist, or remove any listing, suspend or terminate vendor capabilities, and maintain records of repeat infringers, at our discretion. We do not guarantee listing placement, visibility, exclusivity, or that listing data will not be modified, overwritten, or lost — maintain your own records.",
            "Dashboard statistics and analytics shown in the vendor portal may include sample or illustrative data and are not warranted accurate or complete; do not rely on them for business decisions.",
            "You are solely responsible for your taxes, and for compliance with the Consumer Protection (E-Commerce) Rules, 2020 obligations that apply to sellers, including providing accurate seller identity and customer-care information when requested.",
            "You will indemnify DSource.AI (Section 13) without cap for claims arising from your products, listings, or breach of these warranties.",
          ]}
        />
      </Section>

      <Section number="9" title="Acceptable use">
        <p>
          In line with Rule 3(1)(b) of the Information Technology (Intermediary
          Guidelines and Digital Media Ethics Code) Rules, 2021, you must not
          host, upload, submit, or share content that: belongs to another
          person without authorization; is defamatory, obscene, pornographic,
          paedophilic, or invasive of another&apos;s privacy (including bodily
          privacy); is harassing, or promotes enmity or violence; infringes any
          patent, trademark, copyright, or other proprietary right; deceives or
          misleads about the origin of a message or knowingly communicates
          misinformation; impersonates another person; contains malware or
          code designed to disrupt any system; threatens the unity, integrity,
          security, or sovereignty of India or public order; or otherwise
          violates any law.
        </p>
        <p>In addition, you must not:</p>
        <LegalList
          items={[
            "Use AI features to generate deceptive imagery, or present Outputs as photographs of real products or completed work without disclosure.",
            "Attempt to extract, reverse-engineer, or benchmark the underlying models or systems, or circumvent rate limits, feature gates, or access controls.",
            "Scrape, bulk-download, harvest, or resell Platform content, catalog data, or other users' content, or access the Platform by automated means except public search indexing.",
            "Upload images of other people's private property or of identifiable people without permission, or content containing others' sensitive personal information.",
            "Post fake listings or reviews, manipulate pricing data, or use the Platform to send spam or unsolicited communications.",
            "Resell, sublicense, or provide the Platform to third parties as a service.",
          ]}
        />
        <p>
          We may remove content, restrict features, throttle usage, and suspend
          or terminate accounts on violation, on court or government order, or
          on actual knowledge of unlawful content.
        </p>
      </Section>

      <Section number="10" title="Intellectual property; feedback">
        <p>
          The Platform — including its software, design, user interface,
          text, graphics, trademarks (including &quot;DSource.AI&quot;), and
          the selection and arrangement of its content — is owned by us or
          our licensors and protected by law. You receive only a limited,
          revocable, non-exclusive, non-transferable license to use the
          Platform for its intended purpose. No rights are granted by
          implication.
        </p>
        <p>
          If you send us feedback, ideas, or suggestions, you grant us a
          perpetual, irrevocable, royalty-free right to use them without
          restriction or compensation.
        </p>
      </Section>

      <Section number="11" title="Content complaints, IP infringement, and grievance redressal">
        <p>
          If you believe content on the Platform infringes your rights or
          violates the law, submit a complaint to our Grievance Officer:
        </p>
        <LegalList
          items={[
            "Email: hello@dsource.ai (attention: Grievance Officer)",
          ]}
        />
        <p>
          Include: identification of the work or right concerned, the URL or
          location of the material, your contact details, a statement of your
          ownership or authority, and a good-faith declaration that the
          complaint is accurate. We acknowledge complaints within 24 hours and
          dispose of them within 15 days, act on court and government orders
          within the timelines required by law, and maintain a repeat-infringer
          policy under which repeat infringers&apos; accounts are terminated.
          Content removed on a copyright complaint may be restored if the
          complainant does not obtain a court order within the period
          prescribed under the Copyright Rules.
        </p>
      </Section>

      <Section number="12" title="Disclaimers and limitation of liability">
        <Conspicuous>
          The Platform, all AI Outputs, and all catalog and vendor content are
          provided &quot;as is&quot; and &quot;as available&quot;, without
          warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, accuracy,
          non-infringement, and uninterrupted, error-free, or secure operation
          — to the maximum extent permitted by applicable law.
        </Conspicuous>
        <p>To the maximum extent permitted by applicable law:</p>
        <LegalList
          items={[
            "We are not liable for indirect, incidental, special, consequential, punitive, or exemplary damages, or for loss of profits, revenue, data, goodwill, or business opportunity, however arising.",
            "We are not liable for: your reliance on unverified Outputs; differences between visualizations or listings and physical products; the acts, omissions, products, or content of vendors and other third parties; transactions between you and any supplier; third-party AI provider or hosting outages; or unauthorized access resulting from your failure to secure your credentials.",
            "Our total aggregate liability for all claims arising out of or relating to the Platform or these Terms is limited to the greater of (a) the amounts you paid us in the 12 months preceding the event giving rise to the claim, or (b) INR 5,000.",
            "These allocations of risk are a basis of the bargain and apply regardless of the theory of liability (contract, tort, statute, or otherwise), even if a remedy fails of its essential purpose.",
          ]}
        />
        <p>
          Nothing in these Terms excludes or limits liability that cannot be
          excluded under applicable law, including liability for fraud, or
          affects the statutory rights available to consumers under the
          Consumer Protection Act, 2019.
        </p>
      </Section>

      <Section number="13" title="Indemnification">
        <p>
          You will defend, indemnify, and hold harmless DSource.AI, its
          affiliates, and their officers, directors, employees, and agents
          from and against all claims, damages, liabilities, costs, and
          expenses (including reasonable legal fees) arising out of or related
          to: (a) your User Content or Inputs; (b) your use or commercial
          exploitation of Outputs; (c) your breach of these Terms or of
          applicable law; or (d) your violation of any third party&apos;s
          rights. For Vendors, this indemnity additionally covers, without
          cap: product liability, listing inaccuracy, intellectual-property
          infringement in Vendor Content, and tax, regulatory, and
          consumer-protection claims relating to your products or listings.
          We control the defense of any indemnified claim; you may not settle
          any claim without our written consent. This section survives
          termination.
        </p>
      </Section>

      <Section number="14" title="Suspension and termination">
        <LegalList
          items={[
            "You may stop using the Platform at any time and may request account deletion via hello@dsource.ai.",
            "We may suspend or terminate your access immediately, with or without notice, for material breach, legal risk, suspected fraud or abuse, or extended inactivity; and for convenience with reasonable notice.",
            "On termination: your license to the Platform ends; licenses you granted us survive to the extent needed for backups, legal compliance, and content already incorporated or shared; and we may delete stored content associated with your account after 30 days.",
            "Sections that by nature should survive — including Sections 5 (license and warranties), 8 (vendor warranties and license), 10, 12, 13, 15, and 16 — survive termination.",
          ]}
        />
      </Section>

      <Section number="15" title="Changes to the Platform and these Terms">
        <p>
          We may update these Terms. We will post updates on this page with a
          new version number and date, and for material changes we will give
          at least 15 days&apos; advance notice by email or an in-Platform
          notice before they take effect. If you do not agree to a change,
          stop using the Platform and, if applicable, terminate your account
          before the change takes effect; continued use after the effective
          date constitutes acceptance. Material changes affecting vendor
          economics or license scope will require affirmative re-acceptance.
          We keep versioned records of these Terms.
        </p>
      </Section>

      <Section number="16" title="Governing law and dispute resolution">
        <p>
          These Terms are governed by the laws of India. Subject to the
          arbitration provision below, the competent courts in India have
          exclusive jurisdiction.
        </p>
        <p>
          Any dispute arising out of or in connection with these Terms that we
          cannot resolve amicably within 30 days shall be referred to
          arbitration under the Arbitration and Conciliation Act, 1996, by a
          sole arbitrator appointed under the rules of a recognized Indian
          arbitral institution (e.g., the Mumbai Centre for International
          Arbitration), with its seat and venue in India, conducted in
          English. Each party bears its own costs unless the award provides
          otherwise.
        </p>
        <p>
          Nothing in this Section limits: (a) a consumer&apos;s statutory
          right to approach the consumer dispute redressal fora under the
          Consumer Protection Act, 2019; or (b) our right to seek injunctive
          or equitable relief from a court of competent jurisdiction to
          protect intellectual property or prevent misuse of the Platform. To
          the extent permitted by law, disputes must be brought individually
          and not as part of a class or representative proceeding.
        </p>
      </Section>

      <Section number="17" title="General">
        <LegalList
          items={[
            "Severability: if any provision is held invalid, it will be reformed to the minimum extent necessary to be valid and enforceable while preserving its intent, and the remainder of these Terms remains in effect.",
            "Entire agreement: these Terms and the Privacy Policy are the entire agreement between you and us regarding the Platform and supersede prior understandings.",
            "No waiver: our failure to enforce a provision is not a waiver of it.",
            "Assignment: you may not assign these Terms; we may assign them in connection with a merger, acquisition, or sale of assets.",
            "Force majeure: we are not liable for delay or failure caused by events beyond our reasonable control, including outages or discontinuation of third-party AI model providers, cloud infrastructure, or networks.",
            "Notices: we may notify you by email to your registered address or through the Platform; notices to us go to hello@dsource.ai.",
            "Language: these Terms are executed in English; translations are for convenience only.",
          ]}
        />
        <p>
          Questions about these Terms:{" "}
          <a className="underline underline-offset-2" href="mailto:hello@dsource.ai">
            hello@dsource.ai
          </a>{" "}
          or via the <LegalLink href="/help-center">Help Center</LegalLink>.
        </p>
      </Section>
    </LegalLayout>
  );
}
