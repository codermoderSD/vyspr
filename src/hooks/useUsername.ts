"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

const ANIMALS = [
  "wolf",
  "tiger",
  "eagle",
  "shark",
  "panther",
  "falcon",
  "cobra",
  "leopard",
  "lynx",
  "raven",
  "owl",
  "fox",
  "bear",
  "bull",
  "dragon",
  "phoenix",
  "stallion",
  "bison",
  "jaguar",
  "coyote",
];

const STORAGE_KEY = "chat_username";

const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = nanoid(5);
  return `${word}_${number}`;
};

export const useUsername = () => {
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUsername(stored);
        return;
      }
      const newUsername = generateUsername();
      localStorage.setItem(STORAGE_KEY, newUsername);
      setUsername(newUsername);
    };

    main();
  }, []);

  return { username };
};
