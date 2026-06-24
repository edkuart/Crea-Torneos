import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f3e9] px-5 text-stone-950">
      <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
          Torneo no encontrado
        </p>
        <h1 className="mt-3 text-3xl font-black">Revisa el codigo del torneo</h1>
        <p className="mt-3 text-base leading-7 text-stone-700">
          El codigo puede estar mal escrito o el torneo aun no existe en la base de datos.
        </p>
        <Link
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-800 px-5 text-base font-bold text-white"
          href="/"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}

