import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present (len='+process.env.NEXT_PUBLIC_SUPABASE_URL.length+')' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present (len='+process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length+')' : 'MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'present (len='+process.env.SUPABASE_SERVICE_KEY.length+')' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present (len='+process.env.SUPABASE_SERVICE_ROLE_KEY.length+')' : 'MISSING',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'present (len='+process.env.RESEND_API_KEY.length+')' : 'MISSING',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'present (len='+process.env.ADMIN_PASSWORD.length+')' : 'MISSING',
    SHIPPING_ADDRESS: process.env.SHIPPING_ADDRESS ? 'present (len='+process.env.SHIPPING_ADDRESS.length+')' : 'MISSING',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'present (len='+process.env.STRIPE_SECRET_KEY.length+')' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  });
}
