'use client'
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from './components/AuthContext';

export default function Home() {
  const { isAuthenticated, hasRole, loading,userRole } = useAuth();

  const authenticated = isAuthenticated()
  const role = userRole
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Daily Villa & Pool Rental Management
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                A comprehensive platform for managing villa and pool rentals. 
                Book, manage, and track your reservations with ease.
              </p>
             {authenticated && role ? (<div className="mt-10 flex items-center gap-x-6"><Link
                  href={`/dashboard/${role}`}
                  className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Dashboard
                </Link></div>):( <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href="/auth/register"
                  className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Get started
                </Link>
                <Link href="/auth/login" className="text-sm font-semibold leading-6 text-gray-900">
                  Login <span aria-hidden="true">→</span>
                </Link>
              </div>)} 
            
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mt-0 lg:mr-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <Image
                  src={'/home.jpg'}
                  alt="Villa and pool"
                  width={2432}
                  height={1442}
                  className="w-[48rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to manage rentals
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Streamline your villa and pool rental business with our efficient management system.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                Booking Management
              </dt>
              <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Easily create and manage bookings with our intuitive calendar interface.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                Role-based Access
              </dt>
              <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Separate admin and agent roles with appropriate permissions and capabilities.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                Approval Workflow
              </dt>
              <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Streamlined approval process for bookings with notification system.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
