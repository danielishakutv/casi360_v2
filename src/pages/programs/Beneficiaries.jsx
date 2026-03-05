import { Heart } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function Beneficiaries() {
  return (
    <PagePlaceholder
      icon={Heart}
      title="Beneficiaries"
      description="View and manage the beneficiary database. Track enrollment, demographics, and program participation across all initiatives."
    />
  )
}
