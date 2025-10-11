# Gems Furniture

A modern e-commerce platform for premium furniture that transforms houses into homes. Built with React, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure sign-up, sign-in, and profile management
- **Product Catalog**: Browse and search through curated furniture collections
- **Featured Products**: Highlighted items on the homepage
- **Shopping Cart**: Add items, manage quantities, and proceed to checkout
- **Order Management**: Track orders and view purchase history
- **Admin Dashboard**: Manage products, orders, and user data
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Shadcn/ui components with Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Storage)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd gems-furniture
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` (if exists) or configure Supabase settings
   - Ensure Supabase project is set up with required tables and policies

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview the production build locally

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   └── ...             # Custom components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
└── lib/                # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.
