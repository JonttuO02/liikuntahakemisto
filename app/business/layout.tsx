import BusinessNav from '@/app/components/BusinessNav'

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessNav />
      {children}
    </>
  )
}
