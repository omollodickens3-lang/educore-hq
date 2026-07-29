import ContactSupport from '../components/ContactSupport';

export default function HelpPage() {
  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px", color: "#e2e8f0" }}>
        Help &amp; Support
      </h1>
      <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
        Having an issue or a question about EduCore? Reach us directly below —
        we usually respond fastest on WhatsApp.
      </p>
      <ContactSupport />
    </div>
  );
}
