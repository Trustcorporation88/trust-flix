'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/store/authStore';
import { useCart } from '@/lib/store/cartStore';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';

const navLinks = [
  { href: '/shop', label: 'Loja' },
  { href: '/dashboard/agents', label: 'Agentes IA' },
  { href: '/dashboard/creator', label: 'Creator Studio' },
  { href: '/dashboard/instagram', label: 'Instagram' },
  { href: '/dashboard', label: 'Painel' },
];

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { getItemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const cartCount = getItemCount();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="TrustFlix Logo" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-gray-900 hidden sm:inline">TrustFlix</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Icons */}
        <div className="flex items-center space-x-4">
          {/* Cart */}
          <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
            <FiShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <FiUser size={24} />
              </Link>
              <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
            </div>
          ) : (
            <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-gray-600 hover:text-blue-600 font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
