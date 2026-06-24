# Modelo de datos inicial

## Tournament

Representa el torneo.

Campos sugeridos:

- id
- sequenceNumber
- publicCode
- title
- system
- tiebreaks
- roundsPlanned
- currentRoundNumber
- status
- startsAt
- locationLabel
- organizerPinHash
- organizerTokenHash
- createdAt
- updatedAt

Notas:

- `sequenceNumber` sirve para generar nombres automaticos como `Torneo 001`.
- `tiebreaks` guarda la lista ordenada de desempates elegidos para el torneo.

Estados:

- setup
- active
- closed
- cancelled

Sistemas:

- swiss
- round_robin

## Player

Representa un participante.

Campos sugeridos:

- id
- tournamentId
- name
- rating
- seed
- status
- createdAt
- updatedAt

Estados:

- active
- withdrawn
- absent

## Round

Representa una ronda.

Campos sugeridos:

- id
- tournamentId
- roundNumber
- status
- pairedAt
- completedAt

Estados:

- pending
- paired
- in_progress
- completed
- locked

## Game

Representa una partida.

Campos sugeridos:

- id
- tournamentId
- roundId
- boardNumber
- whitePlayerId
- blackPlayerId
- result
- whiteScore
- blackScore
- isBye
- isForfeit
- updatedAt

Resultados:

- white_win
- black_win
- draw
- white_forfeit
- black_forfeit
- double_forfeit
- bye
- unplayed

## AuditLog

Guarda historial de cambios.

Campos sugeridos:

- id
- tournamentId
- action
- entityType
- entityId
- beforeJson
- afterJson
- createdAt

Acciones iniciales:

- tournament_created
- player_added
- player_updated
- round_generated
- result_recorded
- result_changed
- round_locked

## StandingSnapshot

Opcional para guardar tabla publicada.

Campos sugeridos:

- id
- tournamentId
- roundNumber
- data
- createdAt

Uso:

- Congelar una tabla despues de cada ronda.
- Acelerar lectura publica.
- Tener evidencia si se corrige algo despues.
