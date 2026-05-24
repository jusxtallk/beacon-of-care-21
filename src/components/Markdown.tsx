import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Markdown = ({ children }: { children: string }) => (
  <div className="prose-editorial">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);
