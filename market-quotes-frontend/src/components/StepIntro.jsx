import { getViewIntro } from '../data/views';

export default function StepIntro({ view }) {
  const info = getViewIntro(view);
  if (!info) return null;

  return (
    <div className="step-intro-block">
      <div className="step-intro">
        <span className="step-intro__badge">Passo {info.step}</span>
        <h2 className="step-intro__title">{info.title}</h2>
        <p className="step-intro__lead">{info.lead}</p>
      </div>
    </div>
  );
}
