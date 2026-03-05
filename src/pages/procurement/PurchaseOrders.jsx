import { FileText } from 'lucide-react'
import PagePlaceholder from '../../components/PagePlaceholder'

export default function PurchaseOrders() {
  return (
    <PagePlaceholder
      icon={FileText}
      title="Purchase Orders"
      description="Create, track and manage purchase orders. Link POs to requisitions and vendors for complete procurement tracking."
    />
  )
}
