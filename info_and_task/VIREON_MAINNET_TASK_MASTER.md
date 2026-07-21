# VEIRON NETWORK — MAINNET TASK MASTER

**Document:** `VEIRON_MAINNET_TASK_MASTER.md`  
**Versiune:** 1.0.0  
**Țintă:** Veiron Network Mainnet public, sigur, reproductibil și operabil  
**Status inițial:** Toate taskurile sunt `TODO` până când criteriile de acceptare sunt demonstrate  
**Regulă:** niciun task nu se marchează `DONE` doar pentru că există cod sau documentație. Trebuie să existe teste, dovezi și rezultate reproductibile.

---

## 1. Obiectiv final

Veiron trebuie să ajungă la un Mainnet real, cu:

- consens stabil și înghețat;
- genesis final verificat independent;
- stocare durabilă, recuperabilă după crash și scalabilă;
- sincronizare P2P multi-host fără divergențe de consens;
- wallet sigur pentru fonduri reale;
- miner GPU stabil și verificat;
- release-uri semnate și reproductibile;
- infrastructură distribuită pe mai mulți provideri și operatori;
- monitorizare, backup, restore și proceduri de incident;
- audit extern înainte de lansare;
- etichetă publică unică: **Veiron Mainnet**.

Nu este suficientă redenumirea `Mainnet Candidate` în `Mainnet`. Numele se schimbă numai după trecerea tuturor gate-urilor din acest document.

---

## 2. Reguli obligatorii de execuție

1. **Fără fake completion.** Un task este `DONE` doar dacă toate criteriile de acceptare sunt îndeplinite.
2. **Fără stub-uri, mock-uri sau TODO-uri în traseele de producție.** Fixture-urile sunt permise doar în teste.
3. **Codul este sursa de adevăr.** Documentația se actualizează după implementare, nu invers.
4. **Fără compatibilitate artificială cu istoricul Mainnet Candidate.** Rețeaua nu este publică; se permite un singur reset final înainte de înghețarea genesis-ului Mainnet.
5. **Fără schimbări de consens după genesis fără mecanism de upgrade explicit.** Orice regulă de consens trebuie versionată și activată la o înălțime deterministă.
6. **Fără float în consens, dificultate, supply, fees sau cumulative work.** Numai aritmetică întreagă deterministă.
7. **Fără endpoint public nou fără limitare, validare și test de abuz.**
8. **Fără chei private în repository, loguri, crash reports sau telemetry.**
9. **Fiecare task P0 trebuie să aibă teste automate.**
10. **Un task tehnic important se livrează într-un commit separat**, cu mesaj clar și fără modificări fără legătură.
11. **Mainnet public nu depinde de mining pool.** Rețeaua trebuie să poată funcționa cu solo mining și noduri independente.
12. **Devnet și Testnet pot exista doar intern**, pentru teste automate și simulări. Nu apar în produsul public, installer, website sau configurarea implicită.

---

## 3. Clasificare

- **P0 — Launch blocker:** fără el Mainnet nu poate fi lansat.
- **P1 — Obligatoriu înainte sau imediat la lansare:** poate să nu afecteze consensul direct, dar afectează siguranța și operarea.
- **P2 — Post-launch controlat:** nu blochează genesis, dar trebuie planificat.

Efort:

- **S:** modificare izolată;
- **M:** mai multe module;
- **L:** schimbare arhitecturală;
- **XL:** schimbare critică de protocol sau infrastructură.

---

## 4. Gate-uri Mainnet

### G0 — Baseline curat

- repository curat;
- build reproducibil local;
- toate testele existente verzi;
- inventar complet al componentelor;
- niciun secret sau artefact runtime urmărit de Git.

### G1 — Consens final

- target complet de 256 biți;
- dificultate fină și deterministă;
- cumulative work corect;
- reguli de bloc, tranzacție, fee și supply înghețate;
- vectori de test publicați.

### G2 — Storage și recovery

- storage de producție;
- crash recovery verificat;
- backup și restore testate;
- reindex și rebuild state reproductibile.

### G3 — Rețea multi-host

- minimum 5 noduri publice;
- minimum 3 provideri sau regiuni;
- minimum 3 operatori independenți înainte de go-live, dacă este posibil;
- sync, reorg, peer scoring și seed failover demonstrate.

### G4 — Wallet și release security

- keystore auditat;
- recovery verificat;
- binare și update metadata semnate;
- SBOM și checksum publice;
- reproducibilitate documentată.

### G5 — Audit și soak

- audit extern fără vulnerabilități Critical/High deschise;
- fuzzing și property testing active;
- soak multi-host minimum 30 de zile;
- niciun consensus split nerezolvat;
- minimum două exerciții complete backup/restore.

### G6 — Go-live

- genesis ceremony finalizată;
- release final semnat;
- seed-uri disponibile;
- monitorizare și incident response active;
- decizie explicită de lansare semnată și publicată;
- toate produsele schimbate la eticheta **Veiron Mainnet**.

---

# FAZA 0 — CONTROLUL PROIECTULUI ȘI BASELINE

## [ ] MN-0001 — Creează programul oficial Mainnet

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** niciuna

### Implementare

- Creează `docs/mainnet/MAINNET_PROGRAM.md`.
- Definește owner pentru fiecare arie: consensus, node, P2P, wallet, miner, pool, release, infrastructure, audit.
- Creează un board GitHub cu stările `Backlog`, `Ready`, `In Progress`, `Blocked`, `Review`, `Done`.
- Transformă fiecare task din acest document într-un issue GitHub separat.
- Adaugă labels: `P0`, `P1`, `P2`, `consensus`, `storage`, `p2p`, `wallet`, `miner`, `pool`, `security`, `release`, `infra`.
- Adaugă milestone-uri: `M1 Consensus`, `M2 Storage`, `M3 Multi-host`, `M4 Security`, `M5 Audit`, `M6 Mainnet Launch`.

### Criterii de acceptare

- fiecare task are owner și milestone;
- niciun P0 nu rămâne fără owner;
- dependențele sunt reflectate în issue-uri;
- progresul poate fi verificat fără documente locale private.

---

## [ ] MN-0002 — Îngheață baseline-ul actual

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-0001

### Implementare

- Rulează și arhivează rezultatele pentru:
  - `cargo fmt --all --check`;
  - `cargo test --workspace --locked`;
  - `cargo clippy --workspace --all-targets --locked -- -D warnings`;
  - build release al workspace-ului;
  - build explorer;
  - build Control Center;
  - teste SDK;
  - teste Android/mobile core dacă sunt în scope.
- Generează `docs/mainnet/BASELINE_REPORT.md` cu commit SHA, OS, toolchain, rezultate și erori.
- Nu repara erori în același commit cu baseline-ul.

### Criterii de acceptare

- există un raport reproductibil pentru commitul de pornire;
- toate testele care eșuează sunt transformate în issue-uri;
- nu există rezultate prezentate drept verzi dacă au fost sărite.

---

## [ ] MN-0003 — Curăță repository-ul public

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-0002

### Implementare

- Elimină referințele către fișiere inexistente.
- Repară encoding-ul UTF-8 și textele corupte.
- Uniformizează versiunile și descrierile crate-urilor.
- Elimină denumirile depășite `private devnet` din package metadata.
- Verifică toate linkurile din README și docs.
- Adaugă `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` și o politică de disclosure.
- Adaugă license files la nivel de package, conform politicii proiectului.

### Criterii de acceptare

- link checker verde;
- secret scanner verde;
- repository hygiene verde;
- fiecare package public are licență explicită;
- README descrie exact stadiul curent.

---

## [ ] MN-0004 — Protejează ramura principală

**Prioritate:** P0  
**Efort:** S  
**Dependențe:** MN-0001

### Implementare

- Activează branch protection pe `main`.
- Blochează force push și delete.
- Cere PR pentru orice modificare.
- Cere minimum un review pentru consens, wallet, P2P și release.
- Configurează CODEOWNERS.
- Marchează CI, testele, Clippy, auditul de dependențe și secret scan drept required checks.

### Criterii de acceptare

- niciun commit direct pe `main`;
- un PR nu poate fi merge-uit dacă un check obligatoriu eșuează;
- schimbările de consens cer review de la owner-ul definit.

---

# FAZA 1 — IDENTITATEA FINALĂ MAINNET

## [ ] MN-1001 — Introdu `Network::Mainnet`

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-0003

### Implementare

- Adaugă varianta finală `Network::Mainnet`.
- Definește și îngheață:
  - `network_id = veiron-mainnet`;
  - human name `Veiron Mainnet`;
  - address prefix `vire`;
  - data root `.veiron-mainnet`;
  - porturile finale RPC și P2P;
  - chain magic final, unic și diferit de `VMNC`;
  - status label `Mainnet`.
- Creează:
  - `configs/mainnet.toml`;
  - `configs/genesis.mainnet.toml`;
  - `configs/rpc.mainnet.toml`;
  - `configs/miner.mainnet.toml.example`;
  - `configs/pool.mainnet.toml.example`.
- Elimină `allow_mainnet_candidate` din produsul final.
- Păstrează profilurile interne doar în `tests/`, `fixtures/` sau sub feature flag explicit.

### Criterii de acceptare

- orice aplicație publică pornește implicit pe `veiron-mainnet`;
- niciun UI public nu afișează Candidate, Devnet sau Testnet;
- un nod refuză datele cu alt network ID sau chain magic;
- toate testele de separare a rețelelor sunt verzi.

---

## [ ] MN-1002 — Definește resetul final de protocol

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-1001

### Implementare

- Documentează că istoricul Mainnet Candidate nu este istoric Mainnet.
- Adaugă o comandă controlată de ștergere doar pentru date Candidate, nu pentru Mainnet.
- Mainnet nu trebuie să poată fi resetat din CLI normal.
- Installerul trebuie să detecteze date Candidate și să ofere migrare doar pentru wallet/public settings, niciodată pentru chain history.
- Schimbă directoarele și marker-ele astfel încât Candidate și Mainnet să nu poată fi confundate.

### Criterii de acceptare

- Mainnet pornește numai cu genesis-ul final;
- datele Candidate nu sunt încărcate automat;
- resetul Mainnet necesită procedură manuală offline și nu este expus în Control Center.

---

# FAZA 2 — CONSENS FINAL ȘI DIFICULTATE

## [ ] MN-2001 — Înlocuiește `difficulty_leading_zero_bits` cu target 256-bit

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-1002

### Implementare

- Definește un tip canonic `Target256` folosind 256 biți fără float.
- Alege o serializare wire stabilă:
  - 32 bytes big-endian; sau
  - format compact validat plus target extins intern.
- Înlocuiește `difficulty_leading_zero_bits` din block header, mining template, RPC, miner, pool și test fixtures.
- Targetul trebuie să permită ajustări fine, nu salturi de 2×.
- Definește limitele `pow_limit`, minimum work și validarea overflow/underflow.
- Compararea hash-target trebuie făcută determinist pe 256 biți.

### Fișiere afectate

- `veiron-core/src/block.rs`;
- `veiron-core/src/firopow.rs`;
- `veiron-core/src/consensus.rs`;
- `veiron-core/src/network.rs`;
- `veiron-node`;
- `veiron-rpc-gateway`;
- `veiron-miner`;
- `veiron-mining-pool`;
- SDK-urile și UI-urile.

### Criterii de acceptare

- niciun câmp de consens nu mai folosește dificultate exprimată doar ca `u8` biți zero;
- targetul se serializează identic pe toate platformele;
- există vectori pentru target minim, target maxim și boundary equality;
- FiroPoW verifică exact targetul transmis în header.

---

## [ ] MN-2002 — Rescrie DAA pentru target fin

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-2001

### Implementare

- Rescrie LWMA pentru a calcula targetul următor folosind aritmetică întreagă.
- Fără `f64`, `powi`, conversii dependente de platformă sau rounding implicit.
- Definește explicit:
  - fereastra;
  - clamp pentru solve time;
  - limită de creștere/scădere per bloc;
  - comportament la timestamp-uri egale sau invalide;
  - bootstrap pentru primele blocuri;
  - revenirea după hashrate drop;
  - prevenirea oscillation și time-warp.
- Publică formula în `docs/protocol/DIFFICULTY.md`.

### Criterii de acceptare

- aceeași secvență de timestamps produce același target pe Windows și Linux;
- testele acoperă hashrate 0.1×, 1×, 10×, 100× și revenirea la normal;
- targetul nu poate depăși `pow_limit`;
- nu există schimbări bruște de 2× fără justificarea limitei configurate;
- simularea de minimum 100.000 blocuri nu produce overflow sau blocare permanentă.

---

## [ ] MN-2003 — Corectează cumulative work și fork choice

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2001

### Implementare

- Calculează work per bloc din targetul complet, folosind formula documentată.
- Folosește un tip suficient de mare sau big integer determinist.
- Fork choice trebuie să aleagă strict lanțul cu total work mai mare.
- Definește tie-break deterministic doar pentru cazuri cu work identic, fără a înlocui regula principală.
- Elimină orice presupunere bazată pe height ca alegere principală.

### Criterii de acceptare

- un lanț mai scurt cu work mai mare este adoptat;
- un lanț mai lung cu work mai mic este respins;
- cumulative work nu overflow-uiește în scenarii de durată maximă;
- testele de reorg și sync folosesc targeturi reale.

---

## [ ] MN-2004 — Îngheață formatul final al block header-ului

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2001, MN-2002

### Implementare

- Definește versiunea finală a header-ului.
- Include explicit toate câmpurile consensuale, ordinea, endianess și dimensiunile.
- Separă clar:
  - header hash input;
  - FiroPoW seed;
  - nonce;
  - mix hash;
  - block ID.
- Elimină orice serializare implicită Serde din hashing-ul consensual.
- Creează funcții wire manuale și vectori hex.

### Criterii de acceptare

- block ID este identic în Rust, test vectors și SDK de referință;
- modificarea oricărui câmp consensual schimbă hash-ul;
- câmpurile non-consensuale nu intră accidental în hash;
- documentul `BLOCK_FORMAT.md` corespunde byte-for-byte codului.

---

## [ ] MN-2005 — Îngheață formatul final al tranzacției

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-1001

### Implementare

- Definește canonical transaction encoding independent de JSON.
- Îngheață domain separation pentru semnătură.
- Definește reguli pentru:
  - nonce;
  - amount;
  - max fee;
  - priority fee;
  - memo hash;
  - sender public key;
  - signature;
  - network ID.
- Elimină encoding-ul legacy din producție sau izolează-l exclusiv pentru import controlat.
- Definește malleability protections și canonical signature validation.

### Criterii de acceptare

- aceeași tranzacție are același txid pe toate platformele;
- orice modificare semnificativă invalidează semnătura;
- semnăturile non-canonice sunt respinse;
- replay între rețele este imposibil.

---

## [ ] MN-2006 — Revizuiește modelul de fees și supply

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2005

### Implementare

- Verifică matematic supply-ul maxim și efectul rotunjirii halving-urilor.
- Definește dacă monedele arse reduc supply-ul circulant fără a modifica limita de emisie.
- Definește clar base fee target, elasticitate și limită per bloc.
- Schimbă `TARGET_TRANSACTIONS_PER_BLOCK = 1` într-un model justificat prin block weight sau byte target.
- Introdu block weight/serialized size limit, nu doar count de tranzacții.
- Definește minimum relay fee și protecția împotriva spam-ului.

### Criterii de acceptare

- supply-ul teoretic este calculat și publicat;
- niciun bloc nu poate depăși max supply;
- fee market-ul este testat la bloc gol, bloc normal și bloc saturat;
- o tranzacție mare plătește proporțional sau este limitată explicit;
- mempool-ul nu poate fi umplut gratuit cu tranzacții ieftine.

---

## [ ] MN-2007 — Introdu block weight și limite DoS consensuale

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2004, MN-2005

### Implementare

- Definește maximum serialized block bytes sau block weight.
- Definește maximum transaction bytes, signature operations și memo payload.
- Validează limitele înainte de operațiile costisitoare.
- Limitează numărul de adrese, outputs logice și operații per tranzacție dacă formatul evoluează.
- Adaugă benchmark-uri pentru worst-case validation.

### Criterii de acceptare

- un bloc valid nu poate consuma memorie necontrolată;
- blocurile peste limită sunt respinse determinist;
- testele includ payload-uri la limită și peste limită;
- timpul de validare worst-case este măsurat și documentat.

---

## [ ] MN-2008 — Creează vectorii oficiali de consens

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2002–MN-2007

### Implementare

- Creează `test-vectors/consensus/`.
- Include vectori JSON și hex pentru:
  - address derivation;
  - mnemonic derivation;
  - transaction signing;
  - txid;
  - merkle root;
  - block header;
  - FiroPoW input/output;
  - target compact/extins;
  - DAA;
  - block reward;
  - base fee;
  - cumulative work;
  - reorg choice.
- Adaugă runner automat în CI.

### Criterii de acceptare

- vectorii sunt independenți de testele unitare interne;
- toate componentele consumatoare îi validează;
- orice schimbare de vector necesită review de consens și versiune de protocol.

---

# FAZA 3 — GENESIS FINAL

## [ ] MN-3001 — Definește politica economică genesis

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-2006

### Implementare

- Decide și documentează explicit:
  - premine zero sau valoare exactă;
  - adresă genesis;
  - recompensă genesis;
  - fonduri de dezvoltare, dacă există;
  - vesting, dacă există;
  - cine controlează cheile;
  - ce se întâmplă dacă cheia este pierdută.
- Nu ascunde alocări în coinbase sau config.

### Criterii de acceptare

- politica poate fi verificată direct din genesis;
- supply-ul inițial este explicit;
- nu există adrese privilegiate nedeclarate.

---

## [ ] MN-3002 — Creează generatorul determinist de genesis

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2008, MN-3001

### Implementare

- Generează genesis numai din parametri înghețați.
- Include timestamp, mesaj public, network ID, chain magic, target și alocări.
- Nu folosi valori locale, random sau default miner address.
- Creează comandă `veiron-node generate-mainnet-genesis --manifest ...`.
- Output-ul trebuie să includă manifest, block bytes, hash și checksum.

### Criterii de acceptare

- minimum trei mașini independente generează același hash;
- Windows și Linux produc byte-identic;
- genesis nu depinde de ordine JSON sau timezone.

---

## [ ] MN-3003 — Organizează genesis ceremony

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-3002, MN-11001

### Implementare

- Publică înainte de ceremonie parametrii înghețați.
- Invită verificatori externi.
- Fiecare verificator generează genesis independent.
- Colectează semnături GPG/minisign asupra hash-ului și manifestului.
- Publică procesul, output-urile și identitatea versiunii de cod folosite.

### Criterii de acceptare

- minimum trei verificări independente;
- toate produc același genesis hash;
- hash-ul final este semnat și publicat în mai multe locații;
- nicio modificare de consens nu mai este permisă fără reluarea ceremoniei.

---

## [ ] MN-3004 — Blochează pornirea cu genesis greșit

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-3003

### Implementare

- Compilează hash-ul genesis aprobat în binarele Mainnet sau într-un manifest semnat obligatoriu.
- Nodul trebuie să verifice:
  - network ID;
  - chain magic;
  - genesis bytes;
  - genesis hash;
  - protocol version.
- Refuză pornirea dacă datele existente nu corespund.

### Criterii de acceptare

- modificarea unui singur byte din genesis oprește nodul;
- un genesis Candidate nu poate porni ca Mainnet;
- mesajul de eroare este clar, fără reset automat.

---

# FAZA 4 — STORAGE DE PRODUCȚIE

## [ ] MN-4001 — Înlocuiește JSONL cu storage tranzacțional

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-2004, MN-2005

### Implementare

- Selectează un engine embeddable matur: RocksDB, redb sau LMDB, după benchmark și suport multiplatformă.
- Separă logic:
  - block headers;
  - block bodies;
  - canonical height index;
  - block hash index;
  - transaction index;
  - account state;
  - nonce state;
  - chain work;
  - metadata;
  - undo/reorg data.
- Operația de acceptare bloc trebuie să fie atomică.
- Nu folosi un singur fișier JSON pentru starea completă.

### Criterii de acceptare

- crash-ul în timpul commitului nu produce half-written block;
- restartul recuperează ultima stare consistentă;
- lookup după height/hash/txid nu cere încărcarea întregului chain;
- benchmark pe minimum 1.000.000 blocuri simulate.

---

## [ ] MN-4002 — Introdu undo data și reorg atomic

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-4001

### Implementare

- Pentru fiecare bloc păstrează datele necesare rollback-ului stării.
- Reorg-ul trebuie să detașeze și să atașeze blocuri tranzacțional.
- Nu rescrie întregul lanț.
- Definește maximum reorg depth operațional și comportamentul peste limită.
- Reintrodu tranzacțiile eligibile în mempool după reorg.

### Criterii de acceptare

- reorg de 1, 10, 100 și 1.000 blocuri testat;
- crash în mijlocul reorg-ului revine la o stare consistentă;
- balanțele, nonce-urile, supply-ul și indexurile rămân corecte.

---

## [ ] MN-4003 — Creează snapshot și fast sync verificabil

**Prioritate:** P1  
**Efort:** L  
**Dependențe:** MN-4001

### Implementare

- Definește snapshot-uri de state la înălțimi fixe.
- Snapshot-ul trebuie să aibă hash, manifest și semnătură de distribuție.
- Nodul nu trebuie să aibă încredere oarbă în snapshot; verifică headers și commitments.
- Păstrează opțiunea full sync de la genesis.

### Criterii de acceptare

- nod nou poate porni din snapshot și ajunge la același state root;
- snapshot corupt este respins;
- full sync și snapshot sync produc același tip hash și state commitment.

---

## [ ] MN-4004 — Backup, restore și disaster recovery

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-4001

### Implementare

- Creează backup online consistent sau procedură de stop-safe-backup.
- Definește backup pentru chain DB, wallet separat, configs și seed identity.
- Creează `veiron-node verify-backup` și `restore-backup`.
- Documentează RPO/RTO.
- Testează disk-full, file corruption și restore pe alt host.

### Criterii de acceptare

- restore complet pe host curat;
- hash-ul tipului și state-ul coincid;
- minimum două exerciții documentate înainte de lansare;
- wallet backup nu este inclus accidental în backup-ul public al nodului.

---

## [ ] MN-4005 — Migrare de schemă versionată

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-4001

### Implementare

- Introdu `schema_version` în DB.
- Fiecare migrare este one-way, atomică și testată.
- Nodul refuză versiuni necunoscute sau mai noi.
- Înainte de migrare se creează backup verificat.

### Criterii de acceptare

- upgrade și rollback operațional documentate;
- migrarea întreruptă se reia sau revine sigur;
- test fixtures acoperă minimum două versiuni consecutive.

---

# FAZA 5 — P2P, SYNC ȘI REORG MATUR

## [ ] MN-5001 — Peer store persistent și address manager

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-4001

### Implementare

- Păstrează adrese cunoscute, last seen, success/failure, source și ban state.
- Evită conectarea excesivă la același ASN/subnet.
- Separă inbound de outbound peers.
- Selectează peers cu diversitate geografică și de rețea.
- Curăță adresele expirate și invalide.

### Criterii de acceptare

- nodul repornește și recuperează peers validați;
- atacul cu mii de adrese false este limitat;
- minimum 8 conexiuni outbound stabile configurabile.

---

## [ ] MN-5002 — Sincronizare header-first completă

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-2003, MN-4001

### Implementare

- Validează secvența de headers, target, timestamps, cumulative work și checkpoints înainte de block bodies.
- Descarcă blocuri în ferestre limitate și de la peers multipli.
- Introdu timeout, retry, peer rotation și resume persistent.
- Nu accepta branch complet în RAM fără limite.

### Criterii de acceptare

- sync de la genesis pe host curat;
- resume după restart;
- peer care trimite headers invalide este penalizat;
- nodul nu depășește limitele de memorie la lanț lung.

---

## [ ] MN-5003 — Peer scoring și ban policy

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-5001

### Implementare

- Definește scoruri pentru:
  - malformed messages;
  - invalid blocks;
  - invalid transactions;
  - timeout;
  - spam;
  - protocol mismatch;
  - duplicate flooding.
- Separă greșelile tranzitorii de atacurile severe.
- Adaugă ban temporar, decay și manual unban.
- Nu permite ban permanent automat pentru o singură eroare benignă.

### Criterii de acceptare

- policy documentată și testată;
- atacator repetitiv este eliminat;
- peers legitimi cu timeout temporar se pot recupera;
- ban state persistă la restart.

---

## [ ] MN-5004 — Protecție eclipse și sybil de bază

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-5001, MN-5003

### Implementare

- Limite per IP, subnet și ASN unde datele sunt disponibile.
- Randomizare peer selection.
- Minimum peers outbound din surse distincte.
- Anchor peers controlați atent, fără a deveni sursă unică de adevăr.
- Detectează situația în care toți peers anunță un branch inconsistent.

### Criterii de acceptare

- test de eclipse într-un mediu controlat;
- nodul păstrează diversitate outbound;
- seed-urile nu sunt folosite ca autoritate consensuală.

---

## [ ] MN-5005 — Propagare blocuri și tranzacții eficientă

**Prioritate:** P1  
**Efort:** L  
**Dependențe:** MN-5002

### Implementare

- Introdu deduplicare, inventory announcements și request-on-demand.
- Evită trimiterea repetată a block bodies complete.
- Limitează mempool relay.
- Măsoară propagation latency și orphan rate.
- Adaugă protocol upgrade pentru compact block relay dacă este necesar.

### Criterii de acceptare

- fără broadcast storm într-o topologie de minimum 20 noduri;
- latența de propagare este măsurată;
- duplicatele nu consumă validare completă repetată.

---

## [ ] MN-5006 — Checkpoints fără control central abuziv

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-3003

### Implementare

- Genesis este checkpoint obligatoriu.
- Orice checkpoint ulterior trebuie să fie documentat și activat prin release/version upgrade, nu descărcat arbitrar de la un server.
- Nu permite unui operator să rescrie consensul printr-un fișier remote.
- Definește politica de relaxare sau eliminare a checkpoint-urilor după maturizarea rețelei.

### Criterii de acceptare

- nodul nu acceptă checkpoint nesemnat sau necunoscut;
- checkpoint-ul nu poate înlocui regula cumulative work;
- politica este transparentă și auditată.

---

# FAZA 6 — MEMPOOL ȘI RPC PUBLIC

## [ ] MN-6001 — Mempool policy completă

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2005, MN-2006

### Implementare

- Introdu limite globale și per sender.
- Ordonează după fee rate, nu doar fee absolut.
- Definește replacement policy și nonce package handling.
- Evicție deterministă pentru tranzacții ieftine/vechi.
- Protecție împotriva nonce gap spam.
- Revalidare la schimbarea tipului și base fee.

### Criterii de acceptare

- test cu minimum 1 milion de tranzacții sintetice;
- memoria rămâne limitată;
- tranzacțiile invalide nu persistă după reorg;
- minerul primește template valid și economic coerent.

---

## [ ] MN-6002 — Rate limiting în proces pentru RPC

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-6001

### Implementare

- Adaugă token bucket/sliding window pe IP și endpoint.
- Profile distincte: local operator, public read-only, public submit, mining.
- Limite separate pentru block lookup, address history, transaction submit și mining template.
- Returnează `429` cu retry hints.
- Nu te baza exclusiv pe Nginx.

### Criterii de acceptare

- load test cu abuz simultan;
- `/health` și `/status` rămân disponibile sub trafic;
- endpointurile costisitoare nu blochează runtime-ul async;
- limitele sunt configurabile și fail-closed.

---

## [ ] MN-6003 — Autentificare operator și separare endpointuri

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-6002

### Implementare

- Endpointurile administrative nu sunt compilate sau montate în profilul public.
- Folosește token rotabil, mTLS sau unix socket pentru operator.
- Nicio comandă de shutdown, reset, import sau payout nu este publică.
- Documentează threat model pentru RPC.

### Criterii de acceptare

- scanarea routerului public arată doar endpointuri aprobate;
- lipsa secretului oprește profilul operator, nu pornește insecure;
- testele verifică fiecare access mode.

---

## [ ] MN-6004 — API versioning și contract stabil

**Prioritate:** P1  
**Efort:** M  
**Dependențe:** MN-6002

### Implementare

- Mută API-ul public sub `/api/v1` sau definește version header stabil.
- Folosește modele typed și erori standard.
- Paginația are limite maxime.
- Definește backward compatibility și deprecation window.
- Generează OpenAPI sau document echivalent din cod.

### Criterii de acceptare

- SDK TypeScript și Rust folosesc același contract;
- breaking changes cer API v2;
- testele contract rulează în CI.

---

# FAZA 7 — WALLET ȘI KEY MANAGEMENT

## [ ] MN-7001 — Keystore nativ pe fiecare OS

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-2005

### Implementare

- Windows: DPAPI sau Windows Credential Manager pentru wrapping key.
- macOS: Keychain.
- Linux: Secret Service/libsecret, cu fallback criptat explicit.
- AES-256-GCM + Argon2id rămâne format portabil pentru backup, dar cheia de deblocare locală nu stă în plaintext.
- Setează ACL restrictive pe Windows și permisiuni `0600` pe Unix.

### Criterii de acceptare

- furtul fișierului wallet nu permite decriptare fără credential;
- ACL-urile sunt verificate automat;
- fallback-ul nesigur este interzis pe Mainnet.

---

## [ ] MN-7002 — Zeroizare completă și secret lifetime minim

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-7001

### Implementare

- Înlocuiește `String` pentru chei private cu containere zeroizable.
- Nu copia secretul în loguri, erori sau panic payload.
- Decriptează doar în momentul semnării.
- Curăță mnemonic, private key, derived key și plaintext după utilizare.
- Revizuiește crash dumps și telemetry.

### Criterii de acceptare

- testele și auditul nu găsesc chei în loguri;
- toate buffer-ele sensibile implementează zeroize-on-drop;
- niciun `Debug` derivat pentru tipuri secrete.

---

## [ ] MN-7003 — Backup și recovery wallet

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-7001

### Implementare

- Standardizează BIP39 word count și derivation path.
- Creează wizard pentru verificarea seed-ului înainte de wallet activation.
- Introdu export backup criptat și import pe alt dispozitiv.
- Adaugă watch-only wallet.
- Testează recovery cu wallet creat pe Windows și importat pe Linux.

### Criterii de acceptare

- seed-ul recreează exact adresa;
- backup greșit sau parolă greșită nu corupe wallet-ul existent;
- test recovery documentat înainte de lansare.

---

## [ ] MN-7004 — Transaction confirmation sigur

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-7003

### Implementare

- Afișează înainte de semnare:
  - adresa completă;
  - amount;
  - base/max/priority fee;
  - total debit;
  - nonce;
  - network;
  - memo hash.
- Adaugă address checksum validation.
- Protecție anti-clipboard replacement: confirmare vizuală și history warning.
- Fără semnare automată prin endpoint remote.

### Criterii de acceptare

- utilizatorul nu poate semna fără sumar;
- Mainnet și profilele interne au UI vizual diferit în build-urile de test;
- tranzacția semnată corespunde exact sumarului afișat.

---

## [ ] MN-7005 — Threat model și audit wallet

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-7001–MN-7004

### Implementare

- Documentează amenințări: malware local, furt fișier, phishing, clipboard hijack, update compromis, RPC compromis, memory scraping.
- Contractează audit extern pentru storage, signing și updater.
- Remediază toate finding-urile Critical/High.

### Criterii de acceptare

- raport extern public sau sumar public verificabil;
- zero Critical/High deschise;
- Medium au owner și termen clar.

---

# FAZA 8 — MINER GPU ȘI POOL

## [ ] MN-8001 — Validare FiroPoW CPU-reference vs CUDA

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-2001, MN-2008

### Implementare

- Folosește implementarea light/reference doar pentru verificare și vectori, nu pentru mining public.
- Compară CUDA cu reference pentru multiple epoci, heights, nonces și mix hashes.
- Include NVIDIA Pascal, Turing, Ampere și Ada dacă sunt suportate.
- Detectează driver incompatibil, insufficient VRAM și invalid kernel output.

### Criterii de acceptare

- zero diferențe pe vectorii oficiali;
- orice rezultat CUDA este reverificat înainte de submit;
- minerul refuză pornirea dacă parity self-test eșuează.

---

## [ ] MN-8002 — Stabilitate miner și watchdog

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-8001

### Implementare

- Watchdog pentru kernel hang, hashrate zero și driver reset.
- Reconnect cu backoff.
- Template refresh fără a pierde nonce ranges inutil.
- Detectează stale work la schimbarea tipului.
- Telemetrie locală pentru hashrate, temperatură dacă este disponibilă, shares, rejects și uptime.

### Criterii de acceptare

- soak minimum 72 ore pe Windows și Linux;
- fără memory leak;
- restart controlat după driver reset;
- rejected/stale rate măsurată și explicată.

---

## [ ] MN-8003 — Protocol mining versionat

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2004, MN-6004

### Implementare

- Versionează explicit mining template și submit.
- Include target complet, height, previous hash, merkle root, timestamp bounds, expiry și template ID.
- Serverul refuză template expirat, nonce duplicat și mix hash invalid.
- Minerul verifică network ID și genesis identity înainte de mining.

### Criterii de acceptare

- miner Candidate nu se poate conecta la Mainnet;
- submit stale returnează cod distinct;
- contract tests RPC-miner sunt verzi.

---

## [ ] MN-8004 — Migrează pool state la PostgreSQL

**Prioritate:** P1  
**Efort:** XL  
**Dependențe:** MN-8003

### Implementare

- Înlocuiește `pool-state.json` cu DB tranzacțională.
- Tabele pentru workers, shares, rounds, blocks, balances, payout batches și audit log.
- Unique constraints pentru share hash și payout tx hash.
- Operații idempotente.
- Retention și partitioning pentru volume mari de shares.

### Criterii de acceptare

- crash-ul pool-ului nu pierde shares confirmate;
- două instanțe pot citi aceeași stare fără dublu payout;
- migrarea și backup DB sunt testate.

---

## [ ] MN-8005 — Payout signer izolat

**Prioritate:** P1  
**Efort:** XL  
**Dependențe:** MN-7001, MN-8004

### Implementare

- Pool coordinator nu deține cheia hot în procesul public.
- Creează unsigned payout batches.
- Semnarea are loc offline, într-un signer separat sau HSM.
- Introdu limite zilnice, approval multiplu și audit log.
- Confirmarea payout verifică tranzacțiile on-chain și sumele exacte.

### Criterii de acceptare

- compromiterea serverului pool nu oferă acces direct la cheia principală;
- payout dublu este imposibil prin constraints și idempotency;
- recovery procedure testată.

---

## [ ] MN-8006 — Pool-ul nu blochează lansarea chain-ului

**Prioritate:** P0  
**Efort:** S  
**Dependențe:** MN-8003

### Implementare

- Publică solo mining complet funcțional.
- Documentează că pool-ul este serviciu separat.
- Dacă pool-ul nu trece taskurile P1, Mainnet poate porni fără pool oficial.
- Control Center nu trebuie să presupună existența pool-ului.

### Criterii de acceptare

- minerul poate mina direct către un nod Mainnet;
- wallet-ul primește coinbase fără pool;
- oprirea pool-ului nu afectează consensul sau nodurile.

---

# FAZA 9 — INDEXER, EXPLORER, SDK ȘI CONTROL CENTER

## [ ] MN-9001 — Indexer incremental și reorg-safe

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-4002

### Implementare

- Indexerul urmărește canonical chain incremental.
- Păstrează block hash la fiecare height.
- La reorg detașează exact datele branch-ului vechi.
- Nu reconstruiește întreg indexul pentru fiecare divergență normală.
- Introdu DB versionată și checkpoint intern.

### Criterii de acceptare

- reorg de 100 blocuri produce index corect;
- explorer nu afișează tranzacții orfane drept confirmate;
- restartul indexerului reia din ultimul checkpoint consistent.

---

## [ ] MN-9002 — Explorer public sigur

**Prioritate:** P1  
**Efort:** L  
**Dependențe:** MN-6004, MN-9001

### Implementare

- Elimină orice endpoint operator.
- Adaugă pagination strictă.
- Encodează toate datele afișate; fără HTML injectat din memo sau metadata.
- Afișează confirmations și orphan status corect.
- Afișează supply, burned fees și chain work din surse verificate.

### Criterii de acceptare

- security scan frontend verde;
- XSS tests verzi;
- explorer rămâne utilizabil la load test;
- nu se bazează pe date nesincronizate fără warning.

---

## [ ] MN-9003 — SDK-uri Mainnet stabile

**Prioritate:** P1  
**Efort:** L  
**Dependențe:** MN-6004

### Implementare

- SDK Rust și TypeScript cu:
  - typed RPC;
  - network identity verification;
  - transaction construction;
  - offline signing helpers;
  - fee estimation;
  - pagination;
  - retries sigure doar pentru requesturi idempotente.
- Nu include key custody implicit.

### Criterii de acceptare

- examples funcționează pe nod local și public;
- contract tests identice pentru ambele SDK-uri;
- semver și changelog public.

---

## [ ] MN-9004 — Control Center Mainnet-only

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-1001, MN-7004, MN-8003

### Implementare

- Elimină eticheta Candidate.
- Elimină selectorul public Devnet/Testnet.
- Afișează genesis hash, network ID și status de sync.
- Nu pornește mining înainte ca nodul să fie pe Mainnet corect și suficient sincronizat.
- Separă clar wallet balance de pool balance.
- Nu folosi URL public hardcodat fără verificarea network identity.

### Criterii de acceptare

- UI refuză RPC cu alt genesis/network ID;
- toate fluxurile principale au smoke tests;
- erorile critice nu sunt ascunse sub status generic.

---

# FAZA 10 — CI/CD, BUILD ȘI SUPPLY CHAIN

## [ ] MN-10001 — CI la fiecare push și PR

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-0004

### Implementare

- Workflow obligatoriu pentru:
  - fmt;
  - clippy;
  - unit tests;
  - integration tests;
  - consensus vectors;
  - explorer build;
  - SDK tests;
  - Control Center tests;
  - dependency audit;
  - secret scan;
  - license scan.
- Rulează pe Linux și Windows pentru componentele critice.

### Criterii de acceptare

- CI rulează la orice PR relevant;
- main nu poate primi cod roșu;
- testele nu sunt ascunse în release-only workflows.

---

## [ ] MN-10002 — Reproducible builds

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-10001

### Implementare

- Pin Rust toolchain, Node, npm lock, Gradle și native dependencies.
- Elimină timestamps și paths nedeterministe din binare unde este posibil.
- Build în containere curate.
- Compară hash-urile produse de minimum două runners independente.

### Criterii de acceptare

- binarele core/node/wallet/miner sunt reproductibile sau diferențele sunt explicate și minimizate;
- manifestul release conține toolchain și source commit;
- build-ul nu depinde de fișiere locale neversionate.

---

## [ ] MN-10003 — Semnare release și update metadata

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-10002

### Implementare

- Semnează executabilele Windows cu certificat code-signing.
- Semnează pachetele Linux și manifestele.
- Semnează `SHA256SUMS` cu minisign/GPG.
- Updater-ul verifică semnătura, nu doar checksum-ul.
- Cheia de semnare este offline sau în HSM/token hardware.

### Criterii de acceptare

- un release modificat este respins;
- un checksum nesemnat este respins;
- key rotation și revocation sunt documentate;
- Control Center nu instalează update fără verificare completă.

---

## [ ] MN-10004 — SBOM și dependency security

**Prioritate:** P1  
**Efort:** M  
**Dependențe:** MN-10001

### Implementare

- Generează SBOM CycloneDX/SPDX pentru fiecare release.
- Rulează `cargo audit`, `cargo deny`, npm audit controlat și scanner pentru native dependencies.
- Definește policy pentru licențe și vulnerabilități.
- Blochează automat vulnerabilitățile Critical/High exploatabile.

### Criterii de acceptare

- fiecare release are SBOM;
- finding-urile au owner;
- excepțiile sunt documentate și expiră.

---

## [ ] MN-10005 — Provenance și release manifest

**Prioritate:** P1  
**Efort:** M  
**Dependențe:** MN-10002, MN-10003

### Implementare

- Publică manifest cu:
  - commit SHA;
  - tag;
  - toolchain;
  - checksums;
  - signatures;
  - SBOM;
  - genesis hash;
  - protocol version;
  - API version;
  - known issues.
- Fiecare artifact indică exact sursa.

### Criterii de acceptare

- un utilizator poate verifica offline artifactul;
- manifestul este semnat;
- tag-ul Git este semnat și protejat.

---

# FAZA 11 — INFRASTRUCTURĂ MAINNET

## [ ] MN-11001 — Topologie seed și bootstrap distribuită

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-5001

### Implementare

- Minimum 5 seed nodes.
- Minimum 3 provideri sau regiuni diferite.
- DNS seed cu mai multe A/AAAA records.
- Seed-urile nu rulează toate în același cont cloud.
- Publică instrucțiuni pentru operatori independenți.
- Seed-urile oferă peer discovery, nu autoritate consensuală.

### Criterii de acceptare

- oprirea a două seed-uri nu împiedică bootstrap-ul;
- nod nou găsește peers fără configurare manuală;
- seed list este versionată și poate fi actualizată prin release.

---

## [ ] MN-11002 — Sentry architecture pentru nodurile operatorului

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-11001

### Implementare

- Nodurile cu wallet/operator access nu sunt expuse direct.
- Public RPC, seed și mining endpoints rulează separat.
- Folosește firewall allowlists între sentry și backend.
- Cheile wallet nu există pe seed nodes.

### Criterii de acceptare

- compromiterea unui seed nu expune wallet-ul operatorului;
- topology diagram și firewall rules documentate;
- test de izolare realizat.

---

## [ ] MN-11003 — Monitoring și alerting

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-6002, MN-11002

### Implementare

- Metrics pentru height, tip hash, peers, sync lag, reorg, mempool, RPC latency, disk, CPU, RAM, process restarts și certificate expiry.
- Alertă imediată pentru:
  - consensus divergence;
  - height stall;
  - peer count scăzut;
  - disk aproape plin;
  - backup failure;
  - RPC error spike;
  - seed outage.
- Dashboard separat pentru fiecare host.

### Criterii de acceptare

- alert drills înainte de lansare;
- minimum două canale de notificare;
- monitorizarea nu expune secrete.

---

## [ ] MN-11004 — Runbooks și incident response

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-11003

### Implementare

- Runbooks pentru:
  - chain stall;
  - accidental fork;
  - compromised seed;
  - RPC DDoS;
  - corrupted DB;
  - failed upgrade;
  - lost signing key;
  - malicious release;
  - wallet incident;
  - mining pool payout incident.
- Definește severități și cine decide oprirea unui release.

### Criterii de acceptare

- tabletop exercise complet;
- minimum două incidente simulate;
- contactele și responsabilitățile sunt actuale.

---

## [ ] MN-11005 — Backup infrastructură și restore drill

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-4004

### Implementare

- Regula 3-2-1 pentru configs, signing metadata și DB-uri operaționale.
- Backups criptate și testate.
- Restore pe host nou, în alt provider.
- Nu face backup inutil la chain data dacă poate fi resync, dar păstrează snapshot-uri operaționale unde reduc RTO.

### Criterii de acceptare

- restore complet documentat;
- backup invalid detectat automat;
- cheile private sunt tratate separat și cu acces limitat.

---

# FAZA 12 — TESTARE AVANSATĂ ȘI AUDIT

## [ ] MN-12001 — Property testing pentru consens

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2008

### Implementare

- Folosește `proptest` sau echivalent pentru amount, fees, nonce, block assembly, target și DAA.
- Invariante:
  - supply nu depășește limita;
  - balanțele nu devin negative;
  - aceeași stare + același bloc produce același rezultat;
  - reorg + reapply produce stare corectă;
  - serializare round-trip stabilă.

### Criterii de acceptare

- property suite rulează în CI;
- seed-urile de reproducere sunt păstrate la failure;
- zero panic în inputuri arbitrare valide/invalidabile.

---

## [ ] MN-12002 — Fuzzing continuu

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-2008, MN-5002, MN-6004

### Implementare

- Fuzz targets pentru:
  - block decode;
  - transaction decode;
  - P2P messages;
  - RPC JSON;
  - wallet import;
  - config parsing;
  - DB recovery metadata.
- Rulează nightly și înainte de release.

### Criterii de acceptare

- minimum 24h fuzzing per target critic înainte de audit;
- crash-urile au regression tests;
- niciun parser public nu panichează la input arbitrar.

---

## [ ] MN-12003 — Deterministic network simulator

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-5002

### Implementare

- Simulator pentru zeci/sute de noduri virtuale.
- Controlează latency, packet loss, partitions, clock skew și hashrate distribution.
- Simulează forks, selfish behavior de bază, peer churn și node restart.
- Produce rapoarte reproductibile.

### Criterii de acceptare

- după vindecarea partiției, nodurile converg la lanțul cu work maxim;
- niciun state divergence persistent;
- scenariile sunt versionate în repository.

---

## [ ] MN-12004 — Multi-host soak de 30 zile

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** MN-11001–MN-11004, MN-12003

### Implementare

- Rulează minimum 5 noduri în topologie distribuită.
- Include minimum 2 mineri și restarturi controlate.
- Injectează:
  - seed outage;
  - network partition;
  - disk pressure;
  - RPC load;
  - miner disconnect;
  - reorg controlat;
  - node upgrade rolling.
- Păstrează metrici și incident log.

### Criterii de acceptare

- minimum 30 zile fără consensus split nerezolvat;
- uptime infrastructură conform țintei documentate;
- toate nodurile converg după incidente;
- niciun data corruption;
- raport public de soak.

---

## [ ] MN-12005 — Audit extern independent

**Prioritate:** P0  
**Efort:** XL  
**Dependențe:** toate taskurile P0 de cod

### Scope minim

- consens și DAA;
- FiroPoW integration;
- block/transaction encoding;
- fork choice și reorg;
- P2P și sync;
- storage și recovery;
- RPC exposure;
- wallet/keystore/signing;
- updater și release signing;
- mining protocol.

### Criterii de acceptare

- zero Critical deschise;
- zero High deschise;
- toate remedierile sunt reverificate de auditor;
- raport sau attestation publică înainte de lansare.

---

## [ ] MN-12006 — Bug bounty înainte de Mainnet

**Prioritate:** P1  
**Efort:** M  
**Dependențe:** MN-12005

### Implementare

- Definește scope, reguli și severități.
- Oferă canal privat de disclosure.
- Include consensus, wallet, P2P, RPC și updater.
- Exclude atacurile distructive asupra infrastructurii reale fără acord.

### Criterii de acceptare

- program public înainte de go-live;
- SLA de răspuns;
- fond minim pentru recompense sau politică transparentă.

---

# FAZA 13 — PREGĂTIREA LANSĂRII

## [ ] MN-13001 — Freeze de protocol și cod

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** G1–G5

### Implementare

- Oprește feature development.
- Permite numai bugfix, security și release work.
- Etichetează commitul de audit.
- Orice schimbare după audit care atinge scope-ul critic cere re-review.

### Criterii de acceptare

- commitul final este identificat;
- nu există schimbări neauditate în consens;
- changelog complet.

---

## [ ] MN-13002 — Mainnet release package

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-10003, MN-13001

### Artefacte obligatorii

- node Windows/Linux;
- wallet CLI;
- Control Center;
- miner NVIDIA Windows/Linux;
- checksums semnate;
- SBOM;
- release manifest;
- genesis manifest și signatures;
- operator guide;
- backup/restore guide;
- security contacts;
- known limitations.

### Criterii de acceptare

- toate artefactele pornesc pe host curat;
- signatures și checksums verificate automat;
- nu există Candidate în nume, UI sau config.

---

## [ ] MN-13003 — Launch checklist final

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-13002

### Verificări

- genesis hash corect;
- seed-uri online;
- DNS/TLS corecte;
- monitorizare activă;
- alert drills trecute;
- backup verificat;
- release download verificat din exterior;
- nod nou poate face bootstrap;
- miner poate obține template și submit;
- wallet poate crea, restaura, semna și trimite;
- explorer afișează chain-ul corect;
- auditorul confirmă remedierea finding-urilor;
- incident contacts disponibili.

### Criterii de acceptare

- checklist semnat de ownerii tehnici;
- orice element roșu blochează lansarea;
- nu există override verbal.

---

## [ ] MN-13004 — Decizia oficială de go-live

**Prioritate:** P0  
**Efort:** S  
**Dependențe:** MN-13003

### Implementare

- Creează `docs/mainnet/GO_LIVE_DECISION.md`.
- Include data, ora, commit SHA, release tag, genesis hash, audit status, soak report și semnatari.
- Publică documentul înainte de pornirea genesis-ului public.

### Criterii de acceptare

- decizia este explicită și verificabilă;
- nu există lansare accidentală prin simpla pornire a unui VPS.

---

## [ ] MN-13005 — Pornirea Veiron Mainnet

**Prioritate:** P0  
**Efort:** L  
**Dependențe:** MN-13004

### Implementare

- Pornește seed-urile și nodurile conform runbook-ului.
- Verifică genesis hash pe fiecare host.
- Activează mining numai după confirmarea conectivității și a identității rețelei.
- Urmărește primele blocuri, propagation, difficulty și cumulative work.
- Păstrează war room tehnic în primele 24–72 ore.

### Criterii de acceptare

- toate nodurile văd același genesis și tip;
- blocurile sunt validate și propagate;
- nu există chain split;
- dificultatea se ajustează conform simulării;
- wallet și explorer reflectă aceeași stare.

---

## [ ] MN-13006 — Elimină definitiv eticheta Candidate din produs

**Prioritate:** P0  
**Efort:** M  
**Dependențe:** MN-13005

### Implementare

- Actualizează README, website, Control Center, explorer, wallet, miner, pool și SDK.
- `Mainnet Candidate` rămâne doar în documentele istorice/arhivă.
- Configurile Candidate nu sunt incluse în release-ul public.
- API status returnează `Mainnet`.

### Criterii de acceptare

- scan global nu găsește Candidate în artefactele publice;
- network ID este `veiron-mainnet` peste tot;
- documentele istorice sunt clar marcate ca pre-launch.

---

# FAZA 14 — DUPĂ LANSARE

## [ ] MN-14001 — Hypercare 30 zile

**Prioritate:** P1  
**Efort:** L

- monitorizare 24/7;
- daily chain health report;
- review peers, reorgs, block interval și difficulty;
- release rapid numai pentru vulnerabilități sau buguri demonstrate;
- fără feature-uri noi în primele 30 zile.

## [ ] MN-14002 — Upgrade framework

**Prioritate:** P1  
**Efort:** XL

- versionare protocol;
- activation height;
- miner/node readiness signaling informativ;
- rollback plan înainte de activation;
- testnet intern și simulator înainte de orice hard fork.

## [ ] MN-14003 — Descentralizare continuă

**Prioritate:** P1  
**Efort:** L

- ghid pentru full nodes;
- installers simpli;
- mai mulți operatori seed;
- public dashboards fără date sensibile;
- reducerea dependenței de infrastructura fondatorului.

## [ ] MN-14004 — Smart contracts și funcții noi doar după stabilizare

**Prioritate:** P2  
**Efort:** XL

- niciun smart contract, Passport, NFT, DAO sau marketplace înainte ca Mainnet-ul de bază să fie stabil;
- orice extensie trebuie să aibă threat model, specificație și activation plan separat;
- nu modifica regulile de bază prin funcții comerciale grăbite.

---

# 5. Ordinea critică de execuție

Execută în ordinea de mai jos. Nu începe taskuri dependente înainte de finalizarea fundației.

1. MN-0001 → MN-0004
2. MN-1001 → MN-1002
3. MN-2001 → MN-2008
4. MN-3001 → MN-3004
5. MN-4001 → MN-4005
6. MN-5001 → MN-5006
7. MN-6001 → MN-6004
8. MN-7001 → MN-7005
9. MN-8001 → MN-8003 și MN-8006
10. MN-9001 → MN-9004
11. MN-10001 → MN-10005
12. MN-11001 → MN-11005
13. MN-12001 → MN-12006
14. MN-13001 → MN-13006
15. MN-14001 → MN-14004

Pool-ul de producție MN-8004 și MN-8005 poate fi finalizat după genesis dacă solo mining este complet funcțional și pool-ul oficial nu este prezentat drept gata.

---

# 6. Definition of Done global

Un task este `DONE` numai dacă:

- implementarea este completă;
- nu există stub-uri sau TODO-uri în calea de producție;
- testele unitare sunt adăugate;
- testele integration relevante sunt adăugate;
- CI este verde pe platformele suportate;
- documentația publică este actualizată;
- threat model este actualizat dacă suprafața de atac s-a schimbat;
- changelog-ul este actualizat;
- commitul este review-uit;
- criteriile taskului sunt demonstrate prin output, raport sau test automat;
- nu a fost slăbit un check doar pentru a obține verde.

---

# 7. Condițiile minime pentru a folosi public numele „Veiron Mainnet”

Toate trebuie să fie adevărate simultan:

- target 256-bit și DAA final sunt active;
- genesis final este verificat independent și semnat;
- storage-ul nu mai este JSONL;
- full sync, reorg și crash recovery sunt demonstrate;
- minimum 5 noduri publice distribuite sunt active;
- minimum 30 zile de soak fără consensus split nerezolvat;
- wallet-ul și updater-ul au audit extern;
- toate finding-urile Critical/High sunt închise;
- release-urile sunt semnate;
- backup/restore și incident drills sunt trecute;
- go-live decision este publicată;
- binarele și UI-urile verifică `veiron-mainnet` și genesis hash-ul final.

Dacă una dintre aceste condiții lipsește, proiectul rămâne tehnic în pre-lansare, indiferent ce etichetă este scrisă în interfață.
