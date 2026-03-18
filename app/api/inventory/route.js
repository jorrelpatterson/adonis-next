import { NextResponse } from 'next/server';

// TODO: Replace with Supabase queries once products table is set up
// For now these are placeholder routes showing the API structure

export async function GET() {
  // GET /api/inventory — list all products
  return NextResponse.json({
    success: true,
    message: 'Inventory API ready. Connect Supabase products table to go live.',
    products: [],
  });
}

export async function POST(request) {
  // POST /api/inventory — add or update a product
  const body = await request.json();
  
  // Validate required fields
  const required = ['name', 'size', 'cat', 'cost', 'retail'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Product would be saved to Supabase here.',
    product: body,
  });
}

export async function DELETE(request) {
  // DELETE /api/inventory?id=123
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Product ${id} would be deleted from Supabase here.`,
  });
}
