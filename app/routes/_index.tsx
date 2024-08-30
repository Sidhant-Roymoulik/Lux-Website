import { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Lux Engine" },
    { name: "description", content: "Welcome to the Lux Chess Engine!" }
  ];
};

export default function Index() {
  return (
    <main className="container">
      <div className="hero">
        <h1>Welcome to Lux</h1>
        <a href="/play/chessboard" className="play-button">
          Start Playing
        </a>
      </div>
      <footer className="footer">
        <p>Created by Sidhant Roymoulik</p>
      </footer>
    </main>
  );
}
