# Equipment Dismantling Rates Tool

An internal rate management tool for heavy equipment dismantling businesses. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Price Entry View**: Quickly fill in prices for pre-populated equipment combinations
- **Search View**: Look up existing rates with advanced filtering and sorting
- **Add New View**: Add new equipment combinations not in the database
- **Real-time Updates**: Instant feedback with toast notifications
- **Responsive Design**: Works on desktop and tablet devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel-ready

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- npm or yarn package manager

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd equipment-dismantling-rates
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

If you haven't already set up your Supabase database:

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to the SQL Editor in your Supabase dashboard
3. Run the SQL schema provided to create:
   - Tables (equipment_types, makes, models, rates)
   - View (rate_lookup)
   - Trigger (update_updated_at)
   - Seed data (equipment types, makes, models)
   - Pre-populated rates (common equipment combinations with NULL prices)

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under **API**.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
.
├── app/
│   ├── page.tsx              # Main page with tab navigation
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles and Tailwind imports
├── components/
│   ├── PriceEntryView.tsx    # Bulk price entry interface
│   ├── SearchView.tsx        # Employee search/lookup interface
│   ├── AddNewView.tsx        # Add new rate form
│   ├── SearchableSelect.tsx  # Reusable searchable dropdown
│   └── Toast.tsx             # Toast notification component
├── lib/
│   └── supabase.ts           # Supabase client and TypeScript types
├── .env.example              # Environment variable template
├── .env.local                # Your local environment variables (gitignored)
├── package.json              # Dependencies and scripts
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Usage Guide

### Price Entry View (Default)

This is the primary admin view for quickly filling in prices on pre-populated equipment entries:

1. Filter by equipment type or make
2. Select "Needs Price" to show only entries without prices
3. Click into price cells to enter values
4. Tab through rows for quick data entry
5. Click "Save All Changes" to batch save all modified prices

### Search View

For employees to look up existing rates:

1. Use the global search bar to search across all fields
2. Click column headers to sort
3. Use column filter icons for advanced filtering
4. Active filters are displayed as badges and can be removed individually

### Add New View

For adding equipment combinations not already in the database:

1. Select equipment type, make, and model from searchable dropdowns
2. Model dropdown is disabled until a make is selected
3. Enter the price
4. Optionally add notes
5. Click "Save Rate" to add the entry

## Deployment

### Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Add your environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

Vercel will automatically detect Next.js and configure the build settings.

## Database Schema

The application uses the following main tables:

- **equipment_types**: Categories of equipment (Excavator, Bulldozer, etc.)
- **makes**: Equipment manufacturers (Caterpillar, John Deere, etc.)
- **models**: Specific models linked to makes (320, D6, etc.)
- **rates**: Pricing data linking type, make, and model

A database view `rate_lookup` joins these tables for easy querying.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

To add new features:

1. Create components in the `components/` directory
2. Add pages in the `app/` directory
3. Update Supabase types in `lib/supabase.ts` if database schema changes
4. Use the existing toast notification system for user feedback

## Troubleshooting

### "Failed to load data" error

- Verify your Supabase credentials in `.env.local`
- Check that your Supabase tables exist and have data
- Ensure Row Level Security (RLS) policies allow read access

### Styles not loading

- Run `npm install` to ensure Tailwind CSS is installed
- Check that `tailwind.config.ts` includes all component paths
- Restart the development server

### Build errors

- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Run `npm run build` to check for TypeScript errors

## License

This is a private internal tool. All rights reserved.

## Support

For issues or questions, contact your development team.
