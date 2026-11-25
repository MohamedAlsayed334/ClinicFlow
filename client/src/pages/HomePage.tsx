import { ar } from "../content/ar";

export default function HomePage() {
  return (
    <div className="container py-5 text-center">
      <h1>{ar.appName}</h1>
      <p className="lead">{ar.placeholder}</p>
    </div>
  );
}
