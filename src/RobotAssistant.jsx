
import React, { useEffect, useRef } from "react";
import "./RobotAssistant.css";

function RobotAssistant({ targetRef }) {
  const stageRef = useRef(null);

  useEffect(() => {
    let frameId;

    const trackEyes = () => {
      const stage = stageRef.current;
      const target = targetRef?.current;
      const head = stage?.querySelector(".robot-head");

      if (head && target) {
        const headRect = head.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const headX = headRect.left + headRect.width / 2;
        const headY = headRect.top + headRect.height / 2;

        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        const x = Math.max(-7, Math.min(7, (targetX - headX) / 35));
        const y = Math.max(-5, Math.min(5, (targetY - headY) / 35));

        stage.style.setProperty("--eye-x", `${x}px`);
        stage.style.setProperty("--eye-y", `${y}px`);
      }

      frameId = requestAnimationFrame(trackEyes);
    };

    trackEyes();

    return () => cancelAnimationFrame(frameId);
  }, [targetRef]);

  return (
    <div className="robot-stage" ref={stageRef}>
      <div className="robot">
        <div className="robot-antenna"><span /></div>

        <div className="robot-head">
          <div className="robot-glow" />
          <div className="robot-headphone left"><span /></div>

          <div className="robot-face">
            <span className="robot-eye" />
            <span className="robot-eye" />
          </div>

          <div className="robot-headphone right"><span /></div>
        </div>

        <div className="robot-neck" />
        <div className="robot-body" />
        <div className="robot-shadow" />
      </div>
    </div>
  );
}

export default RobotAssistant;
