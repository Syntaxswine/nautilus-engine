baseline SURVIVED 208/208; status after: ""; all restored: true
| ID | Mutation | Where | Suite (pass/tests) | Killed by, or what the survivor does |
| --- | --- | --- | --- | --- |
| A-M05 | clearance disabled (< -1) | adapter `:157` | KILLED 207/208 | bear clearance (aim) |
| A-M05b | clearance tightened (< r+0.1) | adapter `:157` | KILLED 207/208 | bear clearance (aim) |
| A-M14 | load returns editor export | persistence `:51` | KILLED 207/208 | authored JSON (aim) |
| A-M18 | limit x100 | prefab-core `:39` | KILLED 207/208 | 32-building limit (aim) |
| A-M18b | limit >= | prefab-core `:39` | KILLED 207/208 | 32-building limit (aim) |
| A-M16 | both capability checks removed | handoff `:15-16` | KILLED 207/208 | never calls (aim) |
| A-M16a | manifest check removed | handoff `:15` | KILLED 207/208 | never calls (aim) |
| A-M16b | feature-list check removed | handoff `:16` | KILLED 207/208 | never calls (aim) |
| A-M16c | silent host gets all features | handoff `:16` | KILLED 207/208 | never calls (aim) |
| A-M16d | raw input handed over | handoff `:17` | KILLED 207/208 | one validated copy (aim) |
| C01 | hypot -> max (Chebyshev corners) | adapter `:157` | **SURVIVED** 208/208 | Corner witness falsely refused |
| C02 | hypot -> sum (Manhattan corners) | adapter `:157` | **SURVIVED** 208/208 | Corner witness accepted; Tinderbox then fails at start-up |
| C03 | vertical wall length -> thickness (y extent) | adapter `:157` | **SURVIVED** 208/208 | Spawn beside a vertical wall, off its centre, accepted |
| C04 | horizontal wall length -> thickness (x extent) | adapter `:157` | **SURVIVED** 208/208 | Spawn beside an off-centre horizontal wall accepted |
| C05 | y extent copies x extent (axis paste) | adapter `:157` | KILLED 203/208 | 5 tests, including bear clearance (aim) |
| C06 | swap = quarter % 4 (reversed walls) | adapter `:156` | **SURVIVED** 208/208 | Backward horizontal wall misread |
| C07 | x-term clamp dropped | adapter `:157` | **SURVIVED** 208/208 | Spawn beside a horizontal wall accepted |
| C08 | y-term clamp dropped | adapter `:157` | KILLED 207/208 | bear clearance (aim) |
| C09 | playerRadius 0.56 -> 0.60 | adapter `:8` | **SURVIVED** 208/208 | Face 0.58 m falsely refused |
| C10 | playerRadius 0.56 -> 0.53 | adapter `:8` | **SURVIVED** 208/208 | Face 0.545 m accepted |
| C11 | centre distance, no box | adapter `:157` | KILLED 207/208 | bear clearance (aim) |
| C12 | full thickness, not half | adapter `:157` | KILLED 207/208 | bear clearance (aim) |
| C13 | first wall module skipped | adapter `:155` | **SURVIVED** 208/208 | Near wall listed first ignored |
| C14 | bounds: top edge dropped | adapter `:155` | **SURVIVED** 208/208 | Top-row spawn accepted |
| C15 | bounds: right edge dropped | adapter `:155` | **SURVIVED** 208/208 | Right-column spawn accepted |
| C16 | bounds: bottom edge dropped | adapter `:155` | **SURVIVED** 208/208 | Bottom-row spawn accepted |
| C17 | bounds: bottom edge uses width | adapter `:155` | **SURVIVED** 208/208 | Bottom-row spawn accepted |
| P00 | neutral: deep copy of raw | persistence `:51` | **SURVIVED** 208/208 | Neutral control: must survive |
| P01 | parseSave returns editor export | persistence `:95` | **SURVIVED** 208/208 | Loading a save mints identities; two loads differ |
| P02 | createSave stores editor export | persistence `:76` | KILLED 207/208 | authored JSON (aim) |
| P03 | load drops opaque metadata | persistence `:51` | KILLED 205/208 | 3 tests, all pre-existing |
| P04 | load returns the document map | persistence `:51` | KILLED 206/208 | 2 tests, including authored JSON (aim) |
| B01 | limit > 33 (off by one up) | prefab-core `:39` | KILLED 207/208 | 32-building limit (aim) |
| B02 | MAX_BUILDINGS = 33 | prefab-core `:10` | KILLED 207/208 | 32-building limit (aim) |
| B03 | limit counts distinct assets | prefab-core `:39` | KILLED 207/208 | 32-building limit (aim) |
| B04 | limit only for the Gross catalogue | prefab-core `:39` | **SURVIVED** 208/208 | 33 buildings accepted under the combined catalogue |
| B05 | limit only at document open | prefab-core `:39` + prefab-document `:9` | **SURVIVED** 208/208 | 33 buildings accepted by parseMap, validateMap, prefabErrors |
| H00 | neutral: check the parsed input | handoff `:15` | **SURVIVED** 208/208 | Neutral control: must survive |
| H01 | validation errors ignored | handoff `:14` | **SURVIVED** 208/208 | Map failing validate() handed to the host |
| H02 | openMap called without its host | handoff `:17` | **SURVIVED** 208/208 | A class-based host breaks |
| H03 | silent host defaults to wall runs | handoff `:16` | **SURVIVED** 208/208 | Silent host treated as wall-run capable |
| H04 | silent host defaults to prefabs | handoff `:16` | **SURVIVED** 208/208 | Silent host treated as prefab capable |
| H05 | null adapter not checked | handoff `:7` | **SURVIVED** 208/208 | null gets the engine's TypeError, not the message |
| H06 | block check removed | handoff `:13` | KILLED 207/208 | refuses before any call (aim) |
| H07 | missing-host check removed | handoff `:11` | KILLED 207/208 | refuses before any call (aim) |
| E01 | sendToGame bypasses the checks | editor `:21` | **SURVIVED** 208/208 | Capability checks bypassed; see MF1 |
| E02 | connectGame skips checkGameAdapter | editor `:19` | **SURVIVED** 208/208 | Host without openMap connects |
| E03 | sendToGame ignores its argument | editor `:21` | **SURVIVED** 208/208 | sendToGame(json) sends the current document |
| E04 | sendToGame default dropped | editor `:21` | **SURVIVED** 208/208 | sendToGame() with no argument fails |
