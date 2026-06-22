'use client';

import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.png" alt="TrustFlix Logo" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold text-white">TrustFlix</span>
            </div>
            <p className="text-sm text-gray-400">
              Plataforma de vendas e atendimento automático via WhatsApp.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h3 className="text-white font-semibold mb-4">Plataforma</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard/agents" className="hover:text-white">
                  Agentes IA
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="hover:text-white">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link href="/dashboard/instagram" className="hover:text-white">
                  Instagram
                </Link>
              </li>
            </ul>
          </div>

          {/* Loja */}
          <div>
            <h3 className="text-white font-semibold mb-4">Loja</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="hover:text-white">
                  Produtos
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white">
                  Carrinho
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Painel Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h3 className="text-white font-semibold mb-4">Conta</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-white">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Meu Painel
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-sm text-gray-400">
              © {currentYear} TrustFlix. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-white">
                <FiFacebook size={20} />
              </a>
              <a href="#" className="hover:text-white">
                <FiTwitter size={20} />
              </a>
              <a href="#" className="hover:text-white">
                <FiInstagram size={20} />
              </a>
              <a href="#" className="hover:text-white">
                <FiLinkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
