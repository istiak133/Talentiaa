import { useLocation, Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || 'আপনার ইমেইল';

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-center">
        <div className="auth-card verify-card">
          <div className="verify-icon">
            <MailCheck size={48} />
          </div>
          <h1>ইমেইল ভেরিফাই করুন</h1>
          <p className="verify-message">
            আমরা <strong>{email}</strong> এ একটি ভেরিফিকেশন লিংক পাঠিয়েছি।
            অনুগ্রহ করে আপনার ইমেইল চেক করুন এবং লিংকে ক্লিক করুন।
          </p>
          <div className="verify-tips">
            <p>📧 ইমেইল পাননি?</p>
            <ul>
              <li>Spam/Junk ফোল্ডার চেক করুন</li>
              <li>কিছুক্ষণ অপেক্ষা করুন (১-২ মিনিট লাগতে পারে)</li>
              <li>ইমেইল ঠিকানা সঠিক কিনা যাচাই করুন</li>
            </ul>
          </div>
          <Link to="/login" className="btn btn-secondary">
            <ArrowLeft size={18} /> লগইন পেইজে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
