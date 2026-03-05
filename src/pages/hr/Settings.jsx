import { Cog } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function HRSettings() {
  return (
    <PagePlaceholder
      icon={Cog}
      title="HR Settings"
      description="Configure HR module settings including leave policies, payroll parameters, and approval workflows."
    />
  )
}
