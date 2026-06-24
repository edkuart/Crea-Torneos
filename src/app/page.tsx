import { createTournamentAction, searchTournamentAction } from "@/app/actions/tournaments";
import {
  formatTiebreakLabel,
  getDefaultTiebreaks,
  tiebreakCodes,
} from "@/modules/tournaments/tiebreaks";

const phaseItems = [
  {
    title: "Crear torneo",
    description: "Nombre, sistema, rondas y PIN de organizador.",
  },
  {
    title: "Agregar jugadores",
    description: "Lista clara, semillas automaticas y opcion de retirar jugadores.",
  },
  {
    title: "Generar rondas",
    description: "Pareos suizos o todos contra todos con byes visibles.",
  },
  {
    title: "Guardar resultados",
    description: "Cada resultado quedara guardado en base de datos para no perderse.",
  },
];

export default function HomePage() {
  const defaultSwissTiebreaks = getDefaultTiebreaks("swiss");

  return (
    <main className="min-h-screen bg-[#f8f3e9] text-stone-950">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
            Torneos de ajedrez
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-normal text-stone-950 sm:text-6xl">
            Crea torneos sin perder rondas al refrescar.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-700">
            Una web instalable para organizar jugadores, pareos, resultados y tabla
            de posiciones con una experiencia clara para personas mayores.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-md bg-emerald-800 px-6 text-lg font-bold text-white transition hover:bg-emerald-900"
              href="#crear"
            >
              Crear torneo
            </a>
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-md border border-stone-300 bg-white px-6 text-lg font-bold text-stone-950 transition hover:border-stone-500"
              href="#buscar"
            >
              Buscar por codigo
            </a>
          </div>
        </div>

        <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Fase actual</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            Base del proyecto: interfaz inicial, estructura Next.js, TypeScript,
            Tailwind y Prisma preparado para conectar PostgreSQL.
          </p>

          <div className="mt-6 grid gap-3">
            {phaseItems.map((item, index) => (
              <div
                className="rounded-md border border-stone-200 bg-stone-50 p-4"
                key={item.title}
              >
                <p className="text-sm font-bold text-emerald-800">
                  Paso {index + 1}
                </p>
                <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-700">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section
        className="mx-auto grid w-full max-w-6xl gap-5 px-5 pb-12 lg:grid-cols-2 lg:px-8"
        id="crear"
      >
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Crear torneo</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            Si dejas el nombre vacio, el sistema asignara un nombre automatico.
          </p>
          <form action={createTournamentAction} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-base font-bold">
              Nombre del torneo opcional
              <input
                className="min-h-14 rounded-md border border-stone-300 px-4 text-lg outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                placeholder="El sistema puede asignarlo"
                name="title"
                type="text"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-bold">
                Sistema
                <select
                  className="min-h-14 rounded-md border border-stone-300 px-4 text-lg outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                  name="system"
                  defaultValue="swiss"
                >
                  <option value="swiss">Sistema suizo</option>
                  <option value="round_robin">Todos contra todos</option>
                </select>
              </label>
              <label className="grid gap-2 text-base font-bold">
                Rondas
                <input
                  className="min-h-14 rounded-md border border-stone-300 px-4 text-lg outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                  defaultValue={3}
                  max={15}
                  min={1}
                  name="roundsPlanned"
                  required
                  type="number"
                />
              </label>
            </div>
            <fieldset className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
              <legend className="px-1 text-base font-black">Desempates</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {tiebreakCodes.map((code) => (
                  <label
                    className="flex min-h-12 items-center gap-3 rounded-md bg-white px-3 text-base font-bold text-stone-800"
                    key={code}
                  >
                    <input
                      className="size-5 accent-emerald-800"
                      defaultChecked={defaultSwissTiebreaks.includes(code)}
                      name="tiebreaks"
                      type="checkbox"
                      value={code}
                    />
                    {formatTiebreakLabel(code)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 text-base font-bold">
              PIN de organizador
              <input
                className="min-h-14 rounded-md border border-stone-300 px-4 text-lg outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                inputMode="numeric"
                maxLength={8}
                minLength={4}
                name="organizerPin"
                pattern="[0-9]{4,8}"
                placeholder="1234"
                required
                type="password"
              />
            </label>
            <label className="grid gap-2 text-base font-bold">
              Jugadores, uno por linea
              <textarea
                className="min-h-40 rounded-md border border-stone-300 px-4 py-3 text-lg leading-7 outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                defaultValue={"Jugador 1\nJugador 2\nJugador 3\nJugador 4"}
                name="playerNames"
                required
              />
            </label>
            <button
              className="min-h-14 rounded-md bg-stone-950 px-5 text-lg font-bold text-white"
              type="submit"
            >
              Crear y guardar torneo
            </button>
          </form>
        </div>

        <div
          className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
          id="buscar"
        >
          <h2 className="text-2xl font-black">Buscar torneo</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            El organizador podra recuperar un torneo con un codigo corto aunque
            cierre o refresque la pagina.
          </p>
          <form action={searchTournamentAction} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-base font-bold">
              Codigo del torneo
              <input
                className="min-h-14 rounded-md border border-stone-300 px-4 text-lg uppercase outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-800/15"
                name="publicCode"
                placeholder="CT-4821"
                required
                type="text"
              />
            </label>
            <button
              className="min-h-14 rounded-md border border-stone-300 bg-white px-5 text-lg font-bold text-stone-950"
              type="submit"
            >
              Buscar torneo
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
