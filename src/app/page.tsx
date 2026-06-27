import { createTournamentAction, searchTournamentAction } from "@/app/actions/tournaments";
import { Button, ButtonLink, Card, Eyebrow, Input, Select, Textarea } from "@/components/ui";
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
    <main className="min-h-screen bg-surface text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <Eyebrow>Torneos de ajedrez</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-normal text-ink sm:text-6xl">
            Crea torneos sin perder rondas al refrescar.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-700">
            Una web instalable para organizar jugadores, pareos, resultados y tabla
            de posiciones con una experiencia clara para personas mayores.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#crear">Crear torneo</ButtonLink>
            <ButtonLink href="#buscar" variant="outline">
              Buscar por codigo
            </ButtonLink>
          </div>
        </div>

        <Card className="self-center">
          <h2 className="text-2xl font-black">Fase actual</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            Base del proyecto: interfaz inicial, estructura Next.js, TypeScript,
            Tailwind y Prisma preparado para conectar PostgreSQL.
          </p>

          <div className="mt-6 grid gap-3">
            {phaseItems.map((item, index) => (
              <div className="rounded-md border border-border-soft bg-stone-50 p-4" key={item.title}>
                <p className="text-sm font-bold text-brand">Paso {index + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-700">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section
        className="mx-auto grid w-full max-w-6xl gap-5 px-5 pb-12 lg:grid-cols-2 lg:px-8"
        id="crear"
      >
        <Card>
          <h2 className="text-2xl font-black">Crear torneo</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            Si dejas el nombre vacio, el sistema asignara un nombre automatico.
          </p>
          <form action={createTournamentAction} className="mt-5 grid gap-4">
            <Input
              label="Nombre del torneo opcional"
              name="title"
              type="text"
              placeholder="El sistema puede asignarlo"
              hint="Opcional · si lo dejas vacío se asigna automático."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Sistema" name="system" defaultValue="swiss">
                <option value="swiss">Sistema suizo</option>
                <option value="round_robin">Todos contra todos</option>
              </Select>
              <Input
                label="Rondas"
                name="roundsPlanned"
                type="number"
                defaultValue={3}
                min={1}
                max={15}
                required
              />
            </div>
            <details className="group rounded-md border border-border-soft bg-stone-50 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-bold text-stone-500 hover:text-brand">
                <svg
                  aria-hidden
                  className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Opciones avanzadas
              </summary>
              <label className="mt-3 flex items-start gap-3 rounded-md bg-white px-3 py-3 text-base font-bold text-stone-800">
                <input
                  className="mt-0.5 size-5 accent-brand"
                  name="gamesPerMatch"
                  type="checkbox"
                  value="2"
                />
                <span>
                  Ida y vuelta
                  <span className="mt-0.5 block text-sm font-semibold text-stone-500">
                    Cada par se enfrenta dos veces, una con blancas y otra con negras. Los puntos de
                    ambas partidas se suman. En todos contra todos duplica las rondas; ajusta el
                    número de rondas si es necesario.
                  </span>
                </span>
              </label>
            </details>
            <fieldset className="grid gap-3 rounded-md border border-border-soft bg-stone-50 p-4">
              <legend className="px-1 text-base font-black">Desempates</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {tiebreakCodes.map((code) => (
                  <label
                    className="flex min-h-12 items-center gap-3 rounded-md bg-white px-3 text-base font-bold text-stone-800"
                    key={code}
                  >
                    <input
                      className="size-5 accent-brand"
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
            <Input
              label="PIN de organizador"
              name="organizerPin"
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={8}
              pattern="[0-9]{4,8}"
              placeholder="1234"
              required
            />
            <Textarea
              label="Jugadores, uno por linea"
              name="playerNames"
              defaultValue={"Jugador 1\nJugador 2\nJugador 3\nJugador 4"}
              required
              className="min-h-40"
            />
            <Button type="submit" variant="dark" fullWidth>
              Crear y guardar torneo
            </Button>
          </form>
        </Card>

        <Card id="buscar">
          <h2 className="text-2xl font-black">Buscar torneo</h2>
          <p className="mt-2 text-base leading-7 text-stone-700">
            El organizador podra recuperar un torneo con un codigo corto aunque
            cierre o refresque la pagina.
          </p>
          <form action={searchTournamentAction} className="mt-5 grid gap-4">
            <Input
              label="Codigo del torneo"
              name="publicCode"
              type="text"
              placeholder="CT-4821"
              required
              className="uppercase"
            />
            <Button type="submit" variant="outline" fullWidth>
              Buscar torneo
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
