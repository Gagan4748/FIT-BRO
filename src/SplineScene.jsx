import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

function SplineScene({ scene, className }) {
  return (
    <Suspense
      fallback={
        <div className="spline-loading">
          <span className="spline-loader" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}

export default SplineScene;