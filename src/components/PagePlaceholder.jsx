export default function PagePlaceholder({ icon: Icon, title, description }) {
  return (
    <div className="card animate-in">
      <div className="card-body">
        <div className="page-placeholder">
          {Icon && (
            <div className="page-placeholder-icon">
              <Icon size={32} />
            </div>
          )}
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}
