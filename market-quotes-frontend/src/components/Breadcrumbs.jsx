import { getCategoryMeta } from '../data/categories';
import { getViewMeta } from '../data/views';

export default function Breadcrumbs({
  view,
  type,
  symbol,
  assetName,
  onNavigate,
}) {
  const category = getCategoryMeta(type);
  const viewMeta = getViewMeta(view);
  const crumbs = [
    { id: 'explore', label: 'Home', view: 'explore' },
    { id: 'category', label: category.label, view: 'explore', type },
    ...(symbol && assetName
      ? [{ id: 'asset', label: assetName, code: symbol, view: 'analysis' }]
      : []),
    ...(view !== 'explore' ? [{ id: 'view', label: viewMeta.label, view, current: true }] : []),
  ];

  return (
    <nav className="breadcrumbs" aria-label="Percorso">
      <ol className="breadcrumbs__list">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.id} className="breadcrumbs__item">
              {isLast || crumb.current ? (
                <span className="breadcrumbs__current" aria-current="page">
                  {crumb.code ? (
                    <>
                      <span>{crumb.label}</span>
                      <code>{crumb.code}</code>
                    </>
                  ) : (
                    crumb.label
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumbs__link"
                  onClick={() =>
                    onNavigate?.({
                      view: crumb.view,
                      type: crumb.type,
                    })
                  }
                >
                  {crumb.label}
                </button>
              )}
              {!isLast && <span className="breadcrumbs__sep" aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
