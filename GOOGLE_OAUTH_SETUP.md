# 🔧 Google OAuth & Admin Login Setup Guide

## সমস্যা সমাধানের ধাপসমূহ

### **সমস্যা ১: Google Login কাজ করছে না** ❌ → ✅

#### **ধাপ ১: Supabase Dashboard-এ Google OAuth Configure করুন**

1. [Supabase Dashboard](https://supabase.com/dashboard)-এ যান
2. আপনার প্রজেক্ট সিলেক্ট করুন: `dchbtmcitcqdfifoibpb`
3. **Authentication** → **Providers** এ ক্লিক করুন
4. **Google** প্রোভাইডার খুঁজে বের করুন
5. **Enable** করুন

#### **ধাপ ২: Google Cloud Console থেকে Credentials নিন**

1. [Google Cloud Console](https://console.cloud.google.com/)-এ যান
2. নতুন প্রজেক্ট তৈরি করুন বা existing প্রজেক্ট সিলেক্ট করুন
3. **APIs & Services** → **Credentials** এ যান
4. **Create Credentials** → **OAuth client ID**
5. **Application type**: Web application
6. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://your-vercel-domain.vercel.app
   ```
7. **Authorized redirect URIs**:
   ```
   https://dchbtmcitcqdfifoibpb.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   ```
8. **Client ID** এবং **Client Secret** কপি করুন

#### **ধাপ ৩: Supabase-এ Google Credentials দিন**

Supabase Dashboard-এ ফিরে যান:
- **Client ID**: paste করুন
- **Client Secret**: paste করুন
- **Save** করুন

---

### **সমস্যা ২: Admin Login কিভাবে করবেন** 👨‍💼

#### **ধাপ ১: SQL Script রান করুন**

1. Supabase Dashboard → **SQL Editor**
2. নিচের ফাইলটি ওপেন করুন: `fix_google_oauth_and_admin.sql`
3. **লাইন ৬০, ৬১, ৯৩** এ আপনার admin email/password দিন:
   ```sql
   -- লাইন ৬০: আপনার admin email
   'admin@talentiaa.com'  -- এটা পরিবর্তন করুন
   
   -- লাইন ৬১: আপনার admin password
   crypt('Admin@123456', gen_salt('bf'))  -- এটা পরিবর্তন করুন
   ```
4. **Run** করুন

#### **ধাপ ২: Admin Login করুন**

1. `http://localhost:5173/admin/login` এ যান
2. আপনার admin email/password দিন
3. Login করুন ✅

---

### **সমস্যা ৩: Google Login এর সময় Back Button Error** 🔙

**এই ফিক্স অটোমেটিক্যালি কাজ করবে** কারণ:
- ✅ OAuth callback page এখন error handle করে
- ✅ Back button press করলে user-friendly error message দেখাবে
- ✅ Proper redirect logic যোগ করা হয়েছে

---

## ✅ **সব ঠিকভাবে কাজ করছে কিনা টেস্ট করুন**

### **টেস্ট ১: Google Login (Candidate)**
```
1. http://localhost:5173/login এ যান
2. "Google দিয়ে লগইন" ক্লিক করুন
3. Google account select করুন
4. Candidate dashboard-এ redirect হওয়া চাই ✅
```

### **টেস্ট ২: Admin Login**
```
1. http://localhost:5173/admin/login এ যান
2. Email/Password দিন (যেটা SQL-এ সেট করেছেন)
3. Admin dashboard-এ redirect হওয়া চাই ✅
```

### **টেস্ট ৩: Back Button Error Handling**
```
1. Google login শুরু করুন
2. Google account select page এ যান
3. Browser back button চাপুন
4. সুন্দর error message দেখানো চাই ✅
5. "Back to Login" button কাজ করা চাই ✅
```

---

## 🐛 **সমস্যা হলে কি করবেন**

### **Error: "Profile not found"**
```sql
-- Supabase SQL Editor-এ রান করুন:
select * from auth.users order by created_at desc limit 5;
select * from public.users order by created_at desc limit 5;

-- যদি auth.users থাকে কিন্তু public.users না থাকে:
-- তারমানে trigger কাজ করছে না
```

### **Error: "Redirect URI mismatch"**
```
1. Google Cloud Console চেক করুন
2. Authorized redirect URIs তে এইটা আছে কিনা দেখুন:
   https://dchbtmcitcqdfifoibpb.supabase.co/auth/v1/callback
```

### **Error: "Invalid Client ID"**
```
1. Google Cloud Console থেকে আবার Client ID কপি করুন
2. Supabase-এ paste করুন
3. Save করুন
```

---

## 📝 **Important Notes**

1. **Google OAuth শুধু Candidate দের জন্য** (এই মুহূর্তে)
   - Recruiter দের admin invite করতে হবে
   - Admin email/password দিয়ে login করবে

2. **Profile auto-create হবে** যখন:
   - নতুন user signup করবে (email/password)
   - অথবা Google OAuth করবে
   - Database trigger automatically `public.users` table-এ profile তৈরি করবে

3. **Admin account** একবারই তৈরি হবে
   - SQL script `where not exists` check করে
   - Multiple admin create হবে না

---

## 🚀 **Deploy করার আগে**

Vercel-এ deploy করার সময় এই environment variables ঠিক আছে কিনা চেক করুন:

```bash
VITE_SUPABASE_URL=https://dchbtmcitcqdfifoibpb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GEMINI_API_KEY=AIzaSyDu1ftqx1cyEiKB5FtJzDXSaL6yyIsP8QA
```

✅ সব ঠিক থাকলে deploy করুন!

---

## 📞 **কোথাও আটকে গেলে?**

Error message screenshot নিয়ে জানান, আমি সাহায্য করব! 🎯
