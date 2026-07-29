import React from "react";

/**
 * ContactSupport
 * Matches EduCore's existing dark theme (#1e293b cards, #334155 borders,
 * #e2e8f0 text, #2563eb accent).
 *
 * Place at: src/components/ContactSupport.jsx
 */

const CONTACT = {
  phoneDisplay: "0707 527 401",
  whatsappNumber: "254707527401",
  email: "okumukomollo@gmail.com",
  whatsappMessage: "Hi EduCore, I need assistance with my school's account.",
};

export default function ContactSupport() {
  const whatsappHref = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(
    CONTACT.whatsappMessage
  )}`;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Need Help? Talk to Us Directly</h2>
      <p style={styles.subtext}>
        Our support team responds fastest on WhatsApp. Reach out anytime.
      </p>

      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={styles.whatsappBtn}>
        Chat on WhatsApp
      </a>

      <div style={styles.infoRow}>
        <span style={styles.label}>Phone:</span>
        <a href={`tel:+${CONTACT.whatsappNumber}`} style={styles.link}>
          {CONTACT.phoneDisplay}
        </a>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.label}>Email:</span>
        <a href={`mailto:${CONTACT.email}`} style={styles.link}>
          {CONTACT.email}
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "24px",
    borderRadius: "10px",
    background: "#1e293b",
    border: "1px solid #334155",
    maxWidth: "420px",
  },
  heading: {
    margin: "0 0 8px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#e2e8f0",
  },
  subtext: {
    margin: "0 0 18px",
    fontSize: "13px",
    color: "#94a3b8",
  },
  whatsappBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "#25D366",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
    marginBottom: "18px",
  },
  infoRow: {
    display: "flex",
    gap: "8px",
    fontSize: "13px",
    marginBottom: "8px",
  },
  label: {
    fontWeight: 600,
    color: "#94a3b8",
  },
  link: {
    color: "#e2e8f0",
    textDecoration: "none",
  },
};
