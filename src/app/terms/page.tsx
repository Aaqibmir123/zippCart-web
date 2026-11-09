import Link from "next/link";
import { termsDocument as document } from "../../features/auth/legal-content";
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 sm:p-12">
      <Link
        prefetch={false}
        href="/login"
        className="font-semibold text-purple-800"
      >
        ? Sign in
      </Link>
      <h1 className="text-3xl font-bold">{document.title}</h1>
      <p className="leading-7 text-slate-600">{document.intro}</p>
      {document.sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-3 text-xl font-bold">{section.title}</h2>
          <p className="whitespace-pre-wrap leading-7 text-slate-700">
            {section.body}
          </p>
        </section>
      ))}
    </main>
  );
}
