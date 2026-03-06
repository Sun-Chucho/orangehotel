"use client";

import { useEffect, useState } from "react";

export function useIsDirector() {
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("orange-hotel-role");
    setIsDirector(role === "director");
  }, []);

  return isDirector;
}
