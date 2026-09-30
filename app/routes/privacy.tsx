import type { MetaFunction } from "react-router";

const CONTACT_EMAIL = "costatechnolab@gmail.com";
const EFFECTIVE_DATE = "30 September 2026";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy – Blend Wheel" },
  { name: "description", content: "How the Blend Wheel Shopify app handles data." },
];

const styles = {
  page: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "48px 20px 80px",
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#1f1f1f",
    lineHeight: 1.65,
    fontSize: 16,
  },
  h1: { fontSize: 32, margin: "0 0 4px" },
  h2: { fontSize: 20, margin: "36px 0 8px" },
  muted: { color: "#616161", margin: 0 },
} as const;

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Privacy Policy</h1>
      <p style={styles.muted}>Blend Wheel · by Costa Technolab · Effective {EFFECTIVE_DATE}</p>

      <p>
        Blend Wheel ("the App") is a Shopify app built by Costa Technolab, India
        ("we", "us"). It lets merchants show how the notes of a product, such
        as scents, flavors or ingredients, change over time on an interactive
        wheel. This policy explains what information the App collects when a
        merchant installs it, how we use it, and the choices available.
      </p>

      <h2 style={styles.h2}>Information we collect</h2>
      <p><strong>From merchants, through Shopify:</strong></p>
      <ul>
        <li>Your store's Shopify domain and an access token that lets the App work with your store.</li>
        <li>
          Basic details of the store owner or staff member who opens the App,
          when Shopify provides them (name, email address, locale).
        </li>
        <li>Your Blend Wheel plan and subscription status.</li>
      </ul>
      <p>
        <strong>Content you create:</strong> the notes, images, links and
        groups you add are stored in your own Shopify store (as Shopify
        metaobjects and files), not on our servers.
      </p>
      <p>
        <strong>Anonymous usage analytics (Pro plan):</strong> when a shopper
        clicks a note on the wheel, we record which note was clicked, on which
        wheel, and when. We do <strong>not</strong> record who clicked: no
        names, email addresses, customer IDs, order details or cookies.
      </p>
      <p>
        <strong>Server logs:</strong> our hosting provider keeps standard
        request logs, which can include IP addresses and browser type, for
        security and troubleshooting. These are kept for a short period and
        are not used to identify anyone.
      </p>

      <h2 style={styles.h2}>Shopper (customer) data</h2>
      <p>
        The App does not collect, store or process personal data about your
        shoppers. It does not access your customers, orders or checkout.
      </p>

      <h2 style={styles.h2}>How we use information</h2>
      <ul>
        <li>To provide the App's features and show your wheel on your storefront.</li>
        <li>To manage your plan and billing, which is handled by Shopify.</li>
        <li>To show you click analytics for your own store.</li>
        <li>To provide support and fix problems.</li>
      </ul>
      <p>We do not sell or rent information, and we do not use it for advertising.</p>

      <h2 style={styles.h2}>Service providers</h2>
      <p>We share information only with the providers needed to run the App:</p>
      <ul>
        <li><strong>Shopify</strong>: platform, authentication and billing.</li>
        <li><strong>Vercel</strong>: application hosting.</li>
        <li><strong>Supabase</strong>: database hosting (Sydney, Australia).</li>
      </ul>
      <p>
        Because these providers operate internationally, information may be
        processed outside India or your country, with appropriate safeguards.
      </p>

      <h2 style={styles.h2}>Retention and deletion</h2>
      <p>
        We keep merchant information only while the App is installed. When you
        uninstall, your session and plan records and click analytics are
        deleted. Any remaining data is permanently deleted when Shopify sends
        its shop-deletion request, 48 hours after uninstalling. Notes and
        groups are App data inside your Shopify store and are removed by
        Shopify when the App is uninstalled; images you uploaded remain in
        your store's Files.
      </p>

      <h2 style={styles.h2}>Your rights</h2>
      <p>
        Depending on where you live (including under India's Digital Personal
        Data Protection Act, 2023 and the EU/UK GDPR), you may have the right
        to access, correct or delete your personal information, or to
        withdraw consent. We also respond to the data requests Shopify
        forwards to us on behalf of your customers. To make a request, email
        {" "}{mail}. We aim to respond within 30 days.
      </p>

      <h2 style={styles.h2}>Security</h2>
      <p>
        Data is sent over encrypted connections (HTTPS), and access to our
        systems is limited. No method of transmission or storage is completely
        secure, but we take reasonable measures to protect it.
      </p>

      <h2 style={styles.h2}>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The effective date above
        shows when it last changed.
      </p>

      <h2 style={styles.h2}>Contact and grievances</h2>
      <p>
        Costa Technolab, India
        <br />
        Email: {mail}
      </p>
    </main>
  );
}
