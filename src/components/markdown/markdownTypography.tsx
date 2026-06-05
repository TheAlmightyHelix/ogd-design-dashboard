import type { Components } from 'react-markdown';

/**
 * Typography-only overrides for readable markdown (size, line height, vertical rhythm).
 * Shared by chat transcript and static pages (e.g. PRD).
 */
export const markdownTypographyComponents: Components = {
  p: ({ children, ...props }) => (
    <p className="mb-3 last:mb-0" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1
      className="mb-3 mt-5 text-xl font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-2 mt-4 text-lg font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-3 text-base font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1.5" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1.5" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-[1.65] pl-0.5" {...props}>
      {children}
    </li>
  ),
  hr: ({ ...props }) => <hr className="my-4 border-gray-200" {...props} />,
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className="w-full border-collapse border border-gray-300 text-sm leading-normal"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-gray-300 px-3 py-2 text-left font-semibold"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border border-gray-300 px-3 py-2 align-top leading-normal"
      {...props}
    >
      {children}
    </td>
  ),
};
