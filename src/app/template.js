// Remounts on every navigation, replaying the enter animation — each page
// arrives like a fresh sheet on the board.
export default function Template({ children }) {
  return <div className="viz-page-enter">{children}</div>;
}
