# Veiron Network — Politica oficială de Halving și Burn VIRE

**Fișier recomandat:** `info_and_tasks/VIRE_HALVING_AND_BURN_POLICY.md`  
**Versiune:** 1.0.0  
**Statut:** Specificație propusă pentru Mainnet  
**Rețea:** Veiron Mainnet  
**Monedă nativă:** VIRE  
**Precizie:** 8 zecimale  
**Unitate minimă:** 1 viret = 0.00000001 VIRE  

---

## 1. Scop

Acest document definește regulile de consens pentru:

- reducerea recompensei de bloc prin halving;
- reducerea progresivă a ratei de burn;
- distribuirea taxelor între burn și miner;
- contabilizarea supply-ului emis, ars și aflat în circulație;
- limitele pe care nici operatorii, nici website-ul, nici Veiron Center și nici un contract nu le pot modifica;
- testele și taskurile obligatorii înainte de lansarea Veiron Mainnet.

Regula urmărește două obiective:

1. să păstreze oferta maximă VIRE strict limitată;
2. să nu slăbească veniturile minerilor pe măsură ce recompensa de bloc scade.

Burn-ul începe la o rată redusă de **10% din componenta de bază a taxelor** și se înjumătățește la fiecare halving:

```text
10% → 5% → 2.5% → 1.25% → 0.625% → ...
```

Rata de burn nu crește niciodată automat.

---

## 2. Parametrii fixați pentru Mainnet

```text
MAX_SUPPLY_VIRE          = 60,000,000 VIRE
DECIMALS                 = 8
BASE_UNIT                = 1 viret
TARGET_BLOCK_TIME        = 60 secunde
HALVING_INTERVAL         = 1,576,800 blocuri
HALVING_DURATION         = aproximativ 1,095 zile
INITIAL_BLOCK_REWARD     = 19.02587519 VIRE
INITIAL_BURN_RATE        = 10%
BURN_RATE_REDUCTION      = 50% la fiecare halving
GENESIS_HEIGHT           = 0
FIRST_REWARDED_BLOCK     = 1
```

Genesis-ul de la înălțimea `0` nu primește recompensă de mining și nu produce burn.

Fiecare eră conține exact `1,576,800` blocuri recompensate, dacă timpul mediu rămâne la 60 de secunde.

---

## 3. Calcularea erei de halving

Pentru orice bloc minat cu înălțimea `h >= 1`:

```text
halving_era = floor((h - 1) / HALVING_INTERVAL)
```

Exemple:

```text
Blocul 1                       → era 0
Blocul 1,576,800               → era 0
Blocul 1,576,801               → era 1
Blocul 3,153,600               → era 1
Blocul 3,153,601               → era 2
```

Această formulă este obligatorie pentru a elimina orice eroare de tip off-by-one la limita dintre ere.

---

## 4. Recompensa de bloc

Recompensa unei ere este calculată în unități întregi `viret`:

```text
initial_reward_viret = 1,902,587,519

block_reward_viret(era) =
    floor(initial_reward_viret / 2^era)
```

Recompensa efectivă a blocului trebuie să respecte și supply-ul rămas:

```text
effective_block_reward =
    min(block_reward_viret(era), MAX_SUPPLY_VIRET - total_emitted_viret)
```

Dacă recompensa calculată ajunge sub un viret, recompensa devine zero.

`MAX_SUPPLY` este un plafon absolut, nu o promisiune că fiecare ultimă unitate va fi emisă. Din cauza împărțirii întregi la fiecare halving, supply-ul final poate rămâne cu o diferență foarte mică sub plafon.

### Primele ere

| Era | Interval de blocuri | Recompensă/bloc | Rata de burn |
|---:|---:|---:|---:|
| 0 | 1 – 1,576,800 | 19.02587519 VIRE | 10% |
| 1 | 1,576,801 – 3,153,600 | 9.51293759 VIRE | 5% |
| 2 | 3,153,601 – 4,730,400 | 4.75646879 VIRE | 2.5% |
| 3 | 4,730,401 – 6,307,200 | 2.37823439 VIRE | 1.25% |
| 4 | 6,307,201 – 7,884,000 | 1.18911719 VIRE | 0.625% |
| 5 | 7,884,001 – 9,460,800 | 0.59455859 VIRE | 0.3125% |
| 6 | 9,460,801 – 11,037,600 | 0.29727929 VIRE | 0.15625% |
| 7 | 11,037,601 – 12,614,400 | 0.14863964 VIRE | 0.078125% |
| 8 | 12,614,401 – 14,191,200 | 0.07431982 VIRE | 0.0390625% |
| 9 | 14,191,201 – 15,768,000 | 0.03715991 VIRE | 0.01953125% |

---

## 5. Regula ratei de burn

Rata de burn se înjumătățește în aceeași eră în care se înjumătățește recompensa de bloc.

Formula conceptuală:

```text
burn_rate(era) = 10% / 2^era
```

Pentru implementarea de consens nu se folosesc numere floating-point.

Formula exactă în aritmetică întreagă este:

```text
burn_denominator(era) = 10 × 2^era

burn_amount_viret =
    floor(burnable_base_fee_viret / burn_denominator(era))
```

Această formulă produce exact:

```text
era 0:  fee / 10  = 10%
era 1:  fee / 20  = 5%
era 2:  fee / 40  = 2.5%
era 3:  fee / 80  = 1.25%
era 4:  fee / 160 = 0.625%
```

Nu se folosesc:

- `float`;
- `double`;
- procente stocate ca text;
- rotunjire bancară;
- configurări locale;
- valori preluate din website, RPC sau fișiere de administrare.

Rezultatul se rotunjește întotdeauna în jos la cel mai apropiat viret.

Dacă rezultatul este sub un viret:

```text
burn_amount_viret = 0
```

Acest lucru este intenționat. Burn-ul devine natural foarte mic în erele târzii, protejând veniturile minerilor.

---

## 6. Ce parte din taxă este arsă

Burn-ul se aplică numai componentei de bază a taxei.

```text
total_transaction_fee =
    base_fee_component
    + priority_fee
```

Calcul:

```text
burn_amount =
    floor(base_fee_component / (10 × 2^halving_era))

miner_fee =
    total_transaction_fee - burn_amount
```

Minerul primește:

- partea nearsă din taxa de bază;
- 100% din priority fee;
- recompensa de bloc aferentă erei.

```text
miner_income =
    block_reward
    + base_fee_component
    - burn_amount
    + priority_fee
```

Burn-ul nu se aplică direct recompensei de bloc.

---

## 7. Exemple de calcul

### Exemplul A — era 0

```text
Taxă de bază:   1.00000000 VIRE
Priority fee:   0.10000000 VIRE
Rată burn:      10%
Burn:           0.10000000 VIRE
Miner din taxe: 1.00000000 VIRE
```

Calcul:

```text
burn = 1.00000000 / 10
burn = 0.10000000 VIRE

miner_fee =
    1.00000000
    + 0.10000000
    - 0.10000000
    = 1.00000000 VIRE
```

### Exemplul B — era 1

```text
Taxă de bază:   1.00000000 VIRE
Priority fee:   0.10000000 VIRE
Rată burn:      5%
Burn:           0.05000000 VIRE
Miner din taxe: 1.05000000 VIRE
```

### Exemplul C — era 2

```text
Taxă de bază:   1.00000000 VIRE
Priority fee:   0.10000000 VIRE
Rată burn:      2.5%
Burn:           0.02500000 VIRE
Miner din taxe: 1.07500000 VIRE
```

### Exemplul D — taxă foarte mică

```text
Era:             4
Taxă de bază:    0.00000100 VIRE
Taxă în vireți:  100 vireți
Divizor burn:    160
Burn calculat:   floor(100 / 160) = 0 vireți
Miner:           primește întreaga taxă
```

Nu se acumulează resturi fracționare între tranzacții sau blocuri.

---

## 8. Relația dintre halving și burn

Recompensa de bloc și rata de burn se înjumătățesc simultan, dar au funcții diferite:

```text
Halving-ul recompensei:
reduce noile monede emise.

Halving-ul ratei de burn:
reduce partea din taxe distrusă.
```

Această combinație evită ca minerii să fie loviți simultan de:

- recompensă de bloc mai mică;
- burn mare și constant;
- venit insuficient din taxe.

Pe măsură ce recompensa scade, o proporție tot mai mare din taxele plătite ajunge la miner.

---

## 9. Contabilizarea supply-ului

Protocolul trebuie să păstreze separat:

```text
max_supply_viret
total_emitted_viret
total_burned_viret
circulating_supply_viret
remaining_issuance_viret
```

Formulele obligatorii:

```text
circulating_supply =
    total_emitted - total_burned

remaining_issuance =
    max_supply - total_emitted
```

Este interzis:

```text
remaining_issuance =
    max_supply - circulating_supply
```

Monedele arse nu redevin eligibile pentru emitere.

Exemplu:

```text
Max supply:          60,000,000 VIRE
Total emis:          12,000,000 VIRE
Total ars:               50,000 VIRE
Circulating supply:  11,950,000 VIRE
Rămas de emis:       48,000,000 VIRE
```

Burn-ul reduce circulația, dar nu mărește bugetul viitor de emission.

---

## 10. Tipurile de burn

### 10.1 Burn programatic al taxei

Este burn-ul definit în acest document și legat de era de halving.

Caracteristici:

- automat;
- determinist;
- verificat de fiecare validator;
- aplicat numai componentei de bază a taxei;
- înjumătățit la fiecare halving.

### 10.2 Burn voluntar de VIRE

Poate exista o tranzacție nativă explicită:

```text
NativeBurnTransaction {
    network_id
    sender
    amount_viret
    nonce
    fee
    signature
}
```

Suma indicată este arsă integral, indiferent de era de halving.

Burn-ul voluntar:

- necesită semnătura proprietarului;
- nu poate fi anulat;
- nu poate fi trimis către o cheie recuperabilă;
- trebuie înregistrat în receipt;
- trebuie inclus în `total_burned`;
- nu poate fi reemis.

### 10.3 Burn de tokenuri prin contracte

Funcțiile `burn()` ale tokenurilor VRC-20, VRC-721 sau VRC-1155 afectează numai supply-ul contractului respectiv.

Ele nu modifică:

- `total_emitted_viret`;
- `total_burned_viret`;
- `circulating_supply_viret` al VIRE.

Un contract nu poate crea VIRE și nu poate arde VIRE dintr-un cont fără autorizarea explicită a proprietarului.

---

## 11. Validarea blocului

Fiecare Validator Node trebuie să recalculeze independent:

1. era blocului;
2. recompensa permisă;
3. taxa de bază plătită de fiecare tranzacție;
4. priority fee;
5. burn-ul fiecărei tranzacții;
6. burn-ul total al blocului;
7. venitul maxim permis al minerului;
8. `total_emitted`;
9. `total_burned`;
10. noul `circulating_supply`;
11. state root-ul rezultat.

Blocul este invalid dacă:

- minerul revendică mai mult decât recompensa și taxele permise;
- burn-ul declarat este prea mic sau prea mare;
- este folosită rata unei alte ere;
- apare o rotunjire diferită de `floor`;
- monedele arse reapar într-un sold;
- `total_emitted` depășește max supply;
- state root-ul nu corespunde recalculării locale.

---

## 12. Structuri recomandate

```rust
pub struct MonetaryState {
    pub total_emitted_viret: u128,
    pub total_burned_viret: u128,
}

pub struct BlockFeeSummary {
    pub total_base_fee_viret: u128,
    pub total_priority_fee_viret: u128,
    pub total_burned_viret: u128,
    pub total_miner_fee_viret: u128,
}

pub struct MonetaryPolicy {
    pub max_supply_viret: u128,
    pub initial_reward_viret: u128,
    pub halving_interval: u64,
}
```

Funcții de consens recomandate:

```rust
pub fn halving_era(block_height: u64) -> Result<u32, ConsensusError>;

pub fn block_reward_viret(
    block_height: u64,
    total_emitted_viret: u128,
) -> Result<u128, ConsensusError>;

pub fn burn_denominator(
    block_height: u64,
) -> Result<u128, ConsensusError>;

pub fn calculate_fee_burn_viret(
    block_height: u64,
    base_fee_viret: u128,
) -> Result<u128, ConsensusError>;

pub fn calculate_miner_fee_viret(
    block_height: u64,
    base_fee_viret: u128,
    priority_fee_viret: u128,
) -> Result<u128, ConsensusError>;
```

Toate operațiile trebuie să folosească:

- `checked_add`;
- `checked_sub`;
- `checked_mul`;
- `checked_div`;
- tipuri întregi suficient de mari;
- erori explicite la overflow sau underflow.

Nu este permisă saturarea silențioasă.

---

## 13. Date expuse prin RPC

RPC-ul Mainnet trebuie să ofere minimum:

```text
GET /v1/monetary-policy
GET /v1/supply
GET /v1/burn
GET /v1/halving
GET /v1/blocks/{height}/fees
```

### `/v1/monetary-policy`

```json
{
  "network": "veiron-mainnet",
  "maxSupply": "60000000.00000000",
  "initialBlockReward": "19.02587519",
  "halvingIntervalBlocks": 1576800,
  "targetBlockTimeSeconds": 60,
  "initialBurnRate": "10%",
  "burnReductionPerHalving": "50%",
  "burnAppliesTo": "base_fee_only"
}
```

### `/v1/supply`

```json
{
  "totalEmitted": "0.00000000",
  "totalBurned": "0.00000000",
  "circulatingSupply": "0.00000000",
  "remainingIssuance": "60000000.00000000",
  "maxSupply": "60000000.00000000"
}
```

### `/v1/halving`

```json
{
  "currentEra": 0,
  "currentBlockReward": "19.02587519",
  "currentBurnRate": "10%",
  "nextHalvingHeight": 1576801,
  "blocksRemaining": 1576800,
  "estimatedSecondsRemaining": 94608000
}
```

Estimările de timp sunt informative. Înălțimea blocului este sursa de adevăr.

---

## 14. Veiron Center

Veiron Center trebuie să afișeze:

- era curentă;
- recompensa curentă;
- rata curentă de burn;
- următoarea înălțime de halving;
- numărul aproximativ de zile rămase;
- total VIRE emis;
- total VIRE ars;
- circulating supply;
- supply rămas de emis;
- taxele și burn-ul fiecărui bloc;
- explicația că burn-ul scade la fiecare halving.

Aplicația nu calculează politica după reguli proprii. Ea citește datele de la nod și le poate verifica local folosind aceeași bibliotecă SDK.

Nu se afișează valori simulate ca fiind date Mainnet reale.

---

## 15. Website și explorer

Website-ul și explorer-ul trebuie să aibă o pagină publică:

```text
/learn/monetary-policy
/explorer/supply
/explorer/burn
/explorer/halving
```

Pagina trebuie să explice clar:

- max supply-ul;
- diferența dintre emitted și circulating;
- de ce burn-ul nu este reemis;
- de ce rata de burn scade;
- cum sunt protejați minerii;
- formula exactă;
- istoricul burn-ului per bloc și per eră;
- sursa datelor RPC;
- înălțimea ultimului bloc folosit.

Datele trebuie să provină din noduri Mainnet reale și să includă un indicator de actualizare.

---

## 16. Reguli de guvernanță

Politica nu poate fi modificată prin:

- panoul de administrare;
- botul Discord;
- website;
- Firebase Remote Config;
- variabile de mediu;
- fișier local;
- vot simplu al operatorilor;
- contract inteligent;
- cheie de administrator.

Orice modificare necesită un upgrade explicit de consens, versiune nouă de protocol, activare la o înălțime anunțată și consens social suficient.

Pentru politica inițială Mainnet este recomandată înghețarea definitivă a:

```text
MAX_SUPPLY
HALVING_INTERVAL
INITIAL_BLOCK_REWARD
INITIAL_BURN_RATE
BURN_RATE_REDUCTION
BURN_APPLIES_TO
ROUNDING_RULE
```

---

## 17. Vectori obligatorii de test

### Limitele erelor

```text
height 1          → era 0
height 1,576,800  → era 0
height 1,576,801  → era 1
height 3,153,600  → era 1
height 3,153,601  → era 2
```

### Burn pentru 1 VIRE taxă de bază

```text
era 0 → 0.10000000 VIRE
era 1 → 0.05000000 VIRE
era 2 → 0.02500000 VIRE
era 3 → 0.01250000 VIRE
era 4 → 0.00625000 VIRE
```

### Rotunjire

```text
base fee = 99 vireți, era 0
burn = floor(99 / 10)
burn = 9 vireți
```

```text
base fee = 19 vireți, era 1
burn = floor(19 / 20)
burn = 0 vireți
```

### Supply

```text
total_emitted = 1,000 VIRE
total_burned = 10 VIRE

circulating = 990 VIRE
remaining issuance = 59,999,000 VIRE
```

### Reorg

Un reorg trebuie să inverseze exact:

- recompensele emise de blocurile eliminate;
- burn-ul taxelor din blocurile eliminate;
- burn-urile voluntare din blocurile eliminate;
- soldurile și nonce-urile;
- contoarele monetare.

După aplicarea noului branch, valorile trebuie recalculate exclusiv din lanțul canonic.

---

## 18. Taskuri de implementare

### VHB-001 — Înghețarea specificației monetare

**Prioritate:** P0  
**Dependențe:** niciuna

- confirmă parametrii finali;
- aprobă formula erei;
- aprobă formula recompensei;
- aprobă formula burn-ului;
- elimină orice configurare runtime a politicii;
- publică hash-ul specificației aprobate.

**Acceptare:**

- există o singură sursă de adevăr;
- parametrii nu pot fi modificați prin config;
- documentul este inclus în release-ul Mainnet.

---

### VHB-002 — Modul unic `monetary_policy`

**Prioritate:** P0  
**Dependențe:** VHB-001

Creează un modul comun folosit de:

- core;
- node;
- miner;
- RPC;
- indexer;
- explorer;
- Veiron Center;
- SDK-urile oficiale.

**Acceptare:**

- nu există formule duplicate;
- toate componentele trec aceiași vectori de test;
- implementarea nu folosește floating-point.

---

### VHB-003 — Implementarea halving-ului

**Prioritate:** P0  
**Dependențe:** VHB-002

- implementează `halving_era`;
- implementează recompensa în vireți;
- tratează exact limitele erelor;
- oprește reward-ul sub un viret;
- protejează max supply-ul.

**Acceptare:**

- testele de boundary trec;
- nicio recompensă nu depășește valoarea permisă;
- max supply-ul nu poate fi depășit.

---

### VHB-004 — Implementarea burn-ului descrescător

**Prioritate:** P0  
**Dependențe:** VHB-002

- aplică burn numai pe base fee;
- înjumătățește rata la fiecare eră;
- folosește împărțire întreagă cu `floor`;
- trimite restul taxei minerului;
- nu acumula fracții între tranzacții.

**Acceptare:**

- 10%, 5%, 2.5%, 1.25% și 0.625% corespund vectorilor;
- priority fee nu este ars;
- rezultatele sunt identice pe Windows și Linux.

---

### VHB-005 — Contoare monetare în state

**Prioritate:** P0  
**Dependențe:** VHB-003, VHB-004

Adaugă:

```text
total_emitted_viret
total_burned_viret
```

Derivă:

```text
circulating_supply_viret
remaining_issuance_viret
```

**Acceptare:**

- contoarele intră în state root;
- sunt actualizate atomic;
- sunt inversate corect la reorg;
- nu pot deveni negative.

---

### VHB-006 — Validarea coinbase și a taxelor

**Prioritate:** P0  
**Dependențe:** VHB-005

Validatorul recalculează recompensa, taxele și burn-ul fără să aibă încredere în miner.

**Acceptare:**

- blocurile cu coinbase excesiv sunt respinse;
- blocurile cu burn greșit sunt respinse;
- blocurile care reemit VIRE ars sunt respinse.

---

### VHB-007 — Burn voluntar nativ

**Prioritate:** P1  
**Dependențe:** VHB-005

- definește tranzacția;
- definește receipt-ul;
- actualizează state-ul și indexer-ul;
- adaugă avertizare permanentă în wallet.

**Acceptare:**

- burn-ul necesită semnătură validă;
- este ireversibil pe lanțul canonic;
- este reversibil numai prin reorg valid;
- suma apare în `total_burned`.

---

### VHB-008 — RPC monetar

**Prioritate:** P1  
**Dependențe:** VHB-005

Implementează endpoint-urile definite în secțiunea RPC.

**Acceptare:**

- toate valorile sunt returnate ca string-uri zecimale;
- fiecare răspuns include network ID și block height;
- nu există conversii prin floating-point.

---

### VHB-009 — Indexer și explorer

**Prioritate:** P1  
**Dependențe:** VHB-008

- indexează burn per tranzacție, bloc și eră;
- afișează emitted, burned și circulating;
- tratează reorg-urile;
- exportă istoric verificabil.

**Acceptare:**

- totalul indexer-ului corespunde nodului;
- reindexarea de la genesis produce același rezultat;
- un reorg nu dublează burn-ul.

---

### VHB-010 — Veiron Center

**Prioritate:** P1  
**Dependențe:** VHB-008

Adaugă panoul Halving & Burn.

**Acceptare:**

- datele provin de la nodul conectat;
- aplicația verifică network ID;
- nu afișează date Testnet ca Mainnet;
- countdown-ul este marcat drept estimare.

---

### VHB-011 — Website și documentație

**Prioritate:** P1  
**Dependențe:** VHB-008, VHB-009

Publică politica și datele reale.

**Acceptare:**

- formula publică este identică specificației;
- datele au block height și timestamp;
- nu există valori hardcodate prezentate ca live.

---

### VHB-012 — Teste cross-platform și property testing

**Prioritate:** P0  
**Dependențe:** VHB-003, VHB-004, VHB-005

Testează:

- toate limitele de eră;
- taxe minime și maxime;
- overflow/underflow;
- reorg;
- restart;
- snapshot restore;
- diferențe Windows/Linux;
- blocuri malițioase;
- supply cap.

**Acceptare:**

- același input produce același state root;
- nu există panic în codul de consens;
- fuzzing-ul nu găsește bypass al supply-ului.

---

### VHB-013 — Audit extern

**Prioritate:** P0  
**Dependențe:** VHB-012

Auditul trebuie să verifice:

- formula monetară;
- limitele de bloc;
- coinbase;
- fee split;
- burn;
- reorg;
- max supply;
- integer overflow;
- state commitments.

**Acceptare:**

- zero probleme Critical sau High deschise;
- problemele Medium au remediere sau justificare publică;
- raportul și commit-ul auditat sunt publicate.

---

## 19. Gate pentru Mainnet

Politica de halving și burn poate fi activată pe Mainnet numai după ce:

- [ ] specificația este înghețată;
- [ ] vectorii de test sunt publicați;
- [ ] implementarea nu folosește floating-point;
- [ ] max supply-ul este imposibil de depășit;
- [ ] burn-ul nu poate fi reemis;
- [ ] limitele erelor sunt testate;
- [ ] reorg-ul inversează corect contoarele;
- [ ] RPC-ul și indexer-ul corespund state-ului;
- [ ] Veiron Center afișează date reale;
- [ ] website-ul nu folosește date simulate;
- [ ] testele cross-platform trec;
- [ ] auditul extern este finalizat;
- [ ] commit-ul auditat este cel folosit la genesis.

Orice punct nebifat blochează lansarea Mainnet.

---

## 20. Decizia finală recomandată

Politica recomandată pentru Veiron este:

```text
Recompensa de bloc:
se înjumătățește la fiecare 1,576,800 blocuri.

Burn-ul taxei:
începe la 10% din base fee.

La fiecare halving:
rata de burn se înjumătățește.

Priority fee:
100% către miner.

Partea nearsă din base fee:
către miner.

VIRE ars:
eliminat definitiv și nereemis.

Contractele:
nu pot modifica politica monetară nativă.
```

Această regulă păstrează burn-ul mic încă de la început și îl reduce continuu, în timp ce o parte tot mai mare a taxelor rămâne minerilor după fiecare halving.
