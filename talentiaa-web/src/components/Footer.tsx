import { Link } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: '#000',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <AnimatedBackground variant="dots" particleCount={30} color="255, 255, 255" speed={0.12} connectDistance={100} style={{ opacity: 0.25, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Main Footer */}
        <div className="container" style={{ padding: '4rem 2rem 3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '3rem' }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: 'var(--primary)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}>Talentiaa</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: '280px' }}>
                বাংলাদেশের প্রথম AI-পাওয়ার্ড রিক্রুটমেন্ট প্ল্যাটফর্ম। স্মার্ট ম্যাচিং, রিয়েল-টাইম ট্র্যাকিং এবং ইনসাইটফুল অ্যানালিটিক্স।
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
                {[
                  { href: '#', label: 'Facebook', path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
                  { href: '#', label: 'Twitter', path: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z' },
                  { href: '#', label: 'LinkedIn', path: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z' },
                ].map((social) => (
                  <a key={social.label} href={social.href} aria-label={social.label} style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,113,227,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>Platform</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <FooterLink to="/">Job Board</FooterLink>
                <FooterLink to="/signup">For Candidates</FooterLink>
                <FooterLink to="/signup">For Recruiters</FooterLink>
                <FooterLink to="/login">AI Resume Scoring</FooterLink>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <FooterLink to="#">About Us</FooterLink>
                <FooterLink to="#">Careers</FooterLink>
                <FooterLink to="#">Contact</FooterLink>
                <FooterLink to="#">Blog</FooterLink>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <FooterLink to="#">Privacy Policy</FooterLink>
                <FooterLink to="#">Terms of Service</FooterLink>
                <FooterLink to="#">Cookie Policy</FooterLink>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container" style={{
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
              © {year} Talentiaa. All rights reserved.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>
              Built with ❤️ in Bangladesh
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.88rem',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      fontWeight: 400,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'white'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateX(3px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLAnchorElement).style.transform = ''; }}
    >
      {children}
    </Link>
  );
}
