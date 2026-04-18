import { NextResponse } from 'next/server';

export async function GET() {
  // GET /api/orders — list all orders
  return NextResponse.json({
    success: true,
    message: 'Orders API ready. Connect Supabase orders table to go live.',
    orders: [],
  });
}

export async function POST(request) {
  // POST /api/orders — create new order (called from app checkout)
  const body = await request.json();
  
  const required = ['items', 'shipping', 'total'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing: ${field}` }, { status: 400 });
    }
  }

  // Generate order ID
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // TODO: 
  // 1. Save to Supabase orders table
  // 2. Decrement inventory stock
  // 3. Send confirmation email via SendGrid
  // 4. Create Stripe checkout session

  return NextResponse.json({
    success: true,
    orderId,
    message: 'Order created. Supabase + SendGrid integration pending.',
  });
}

export async function PATCH(request) {
  // PATCH /api/orders — update order status
  const body = await request.json();
  const { orderId, status } = body;

  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
  }

  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    orderId,
    status,
    message: 'Status updated.',
  });
}
