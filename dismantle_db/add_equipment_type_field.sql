-- Add equipment_type field and image columns to equipment_dimensions table
-- Run this in your Supabase SQL editor

-- Add the equipment_type column
ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS equipment_type TEXT DEFAULT 'other';

-- Add image columns for front and side views
ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS front_image_base64 TEXT;

ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS side_image_base64 TEXT;

-- Valid equipment types: excavator, wheel_loader, bulldozer, skid_steer, compact_track_loader,
-- telehandler, forklift, crane, dump_truck, backhoe, motor_grader, roller, scraper, other

-- Update equipment types based on model names and patterns

-- Excavators (run first as it's the most common)
UPDATE equipment_dimensions ed
SET equipment_type = 'excavator'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar excavators (300 series)
  (mk.name = 'Caterpillar' AND m.name ~* '^3[0-9]{2}')
  -- Hitachi ZX series
  OR m.name ~* '^ZX[0-9]'
  -- Komatsu PC series
  OR m.name ~* '^PC[0-9]'
  -- Volvo EC series
  OR m.name ~* '^EC[0-9]'
  -- Case CX series
  OR m.name ~* '^CX[0-9]'
  -- Kobelco SK series
  OR m.name ~* '^SK[0-9]'
  -- JCB JS series
  OR m.name ~* '^JS[0-9]'
  -- Hyundai HX series
  OR m.name ~* '^HX[0-9]'
  -- Doosan DX series (excavators)
  OR m.name ~* '^DX[0-9]'
  -- Liebherr R series
  OR (mk.name = 'Liebherr' AND m.name ~* '^R[0-9]')
  -- John Deere G series excavators
  OR (mk.name = 'John Deere' AND m.name ~* '^[0-9]+G$')
  -- Bobcat E series
  OR (mk.name = 'Bobcat' AND m.name ~* '^E[0-9]')
  -- Takeuchi TB series
  OR m.name ~* '^TB[0-9]'
  -- Kubota KX and U series
  OR m.name ~* '^KX[0-9]' OR m.name ~* '^U[0-9]'
  -- Yanmar VIO and SV series
  OR m.name ~* '^VIO[0-9]' OR (mk.name = 'Yanmar' AND m.name ~* '^SV[0-9]')
  -- SANY SY series
  OR m.name ~* '^SY[0-9]'
  -- Wacker Neuson EZ series
  OR m.name ~* '^EZ[0-9]'
  -- Link-Belt excavators
  OR mk.name = 'Link-Belt'
  -- Sumitomo SH series
  OR m.name ~* '^SH[0-9]'
  -- IHI mini excavators
  OR mk.name = 'IHI'
  -- Terex TC/HD series
  OR (mk.name = 'Terex' AND m.name ~* '^TC[0-9]|^HD[0-9]')
  -- New Holland E series excavators (not wheel loaders)
  OR (mk.name = 'New Holland' AND m.name ~* '^E[0-9]' AND m.name !~* 'C$')
  -- LiuGong excavators
  OR (mk.name = 'LiuGong' AND m.name ~* '^9[0-9]')
  -- Gradall
  OR mk.name = 'Gradall'
  -- Sennebogen
  OR mk.name = 'Sennebogen'
  -- Mecalac MCR series
  OR m.name ~* 'MCR'
);

-- Wheel Loaders
UPDATE equipment_dimensions ed
SET equipment_type = 'wheel_loader'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar wheel loaders (9xx series)
  (mk.name = 'Caterpillar' AND m.name ~* '^9[0-9]{2}')
  -- Komatsu WA series
  OR m.name ~* '^WA[0-9]'
  -- Volvo L series wheel loaders
  OR (mk.name = 'Volvo' AND m.name ~* '^L[0-9]')
  -- John Deere K series wheel loaders
  OR (mk.name = 'John Deere' AND m.name ~* '^[0-9]+K$')
  -- Hyundai HL series
  OR m.name ~* '^HL[0-9]'
  -- Doosan DL series
  OR m.name ~* '^DL[0-9]'
  -- Liebherr L5xx series
  OR (mk.name = 'Liebherr' AND m.name ~* '^L5[0-9]')
  -- Case wheel loaders (numbered)
  OR (mk.name = 'Case' AND m.name ~* '^[0-9]+[A-Z]?$' AND m.name::integer > 500)
  -- LiuGong wheel loaders
  OR (mk.name = 'LiuGong' AND m.name ~* '^8[0-9]')
)
AND ed.equipment_type = 'other';

-- Bulldozers/Dozers
UPDATE equipment_dimensions ed
SET equipment_type = 'bulldozer'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar D series
  (mk.name = 'Caterpillar' AND m.name ~* '^D[5-9]$|^D[5-9][A-Z]|^D1[0-1]')
  -- Komatsu D series
  OR (mk.name = 'Komatsu' AND m.name ~* '^D[0-9]')
  -- John Deere K series dozers
  OR (mk.name = 'John Deere' AND m.name ~* '^[0-9]+K$' AND m.name ~* '^[6-9]|^1[0-1]')
  -- Case M series dozers
  OR (mk.name = 'Case' AND m.name ~* '^[0-9]+M$')
)
AND ed.equipment_type = 'other';

-- Compact Track Loaders (CTL)
UPDATE equipment_dimensions ed
SET equipment_type = 'compact_track_loader'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar D3 series CTL
  (mk.name = 'Caterpillar' AND m.name ~* '^2[0-9]{2}D3?$')
  -- Bobcat T series
  OR (mk.name = 'Bobcat' AND m.name ~* '^T[0-9]')
  -- Case TR series
  OR m.name ~* '^TR[0-9]'
  -- John Deere G series CTL (31xG, 32xG, 33xG)
  OR (mk.name = 'John Deere' AND m.name ~* '^3[1-3][0-9]G$')
  -- Kubota SVL series
  OR m.name ~* '^SVL[0-9]'
  -- Takeuchi TL series
  OR m.name ~* '^TL[0-9]'
  -- ASV RT series
  OR m.name ~* '^RT'
  -- Mustang RT series
  OR (mk.name = 'Mustang' AND m.name ~* 'RT$')
  -- New Holland C series
  OR (mk.name = 'New Holland' AND m.name ~* '^C[0-9]')
  -- Wacker Neuson MTX series
  OR m.name ~* 'MTX'
)
AND ed.equipment_type = 'other';

-- Skid Steers
UPDATE equipment_dimensions ed
SET equipment_type = 'skid_steer'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Bobcat S series
  (mk.name = 'Bobcat' AND m.name ~* '^S[0-9]')
  -- Case SV series
  OR m.name ~* '^SV[0-9]'
  -- John Deere skid steers (31xG but not CTL pattern)
  OR (mk.name = 'John Deere' AND m.name ~* '^31[0-7]G$')
  -- Kubota SSV series
  OR m.name ~* '^SSV[0-9]'
  -- New Holland L series (skid steer)
  OR (mk.name = 'New Holland' AND m.name ~* '^L[0-9]')
  -- Gehl R/V series
  OR (mk.name = 'Gehl' AND m.name ~* '^R[0-9]|^V[0-9]')
)
AND ed.equipment_type = 'other';

-- Telehandlers
UPDATE equipment_dimensions ed
SET equipment_type = 'telehandler'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- JLG G series
  (mk.name = 'JLG' AND m.name ~* '^G[0-9]|^[0-9]+$')
  -- Genie GTH series
  OR m.name ~* '^GTH'
  -- Manitou MT series
  OR m.name ~* '^MT[0-9]'
  -- CAT TH series
  OR m.name ~* '^TH[0-9]'
)
AND ed.equipment_type = 'other';

-- Backhoe Loaders
UPDATE equipment_dimensions ed
SET equipment_type = 'backhoe'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar backhoes (4xxF series)
  (mk.name = 'Caterpillar' AND m.name ~* '^4[0-9]{2}F|^4[0-9]{2}XE|^440')
  -- Case backhoes (580, 590 series)
  OR (mk.name = 'Case' AND m.name ~* '^58|^59')
  -- JCB backhoes (3CX, 4CX, 5CX)
  OR m.name ~* '^[3-5]CX'
  -- John Deere backhoes (3xxL, 4xxL series)
  OR (mk.name = 'John Deere' AND m.name ~* '^[34][0-9]{2}[LS]')
  -- New Holland B series backhoes
  OR (mk.name = 'New Holland' AND m.name ~* '^B[0-9]')
)
AND ed.equipment_type = 'other';

-- Articulated Dump Trucks (ADT)
UPDATE equipment_dimensions ed
SET equipment_type = 'dump_truck'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar ADTs (7xx series)
  (mk.name = 'Caterpillar' AND m.name ~* '^7[234][05]$')
  -- Volvo A series ADTs
  OR (mk.name = 'Volvo' AND m.name ~* '^A[234][05]')
  -- Komatsu HM series
  OR m.name ~* '^HM[0-9]'
  -- Bell B series
  OR (mk.name = 'Bell' AND m.name ~* '^B[234][05]')
)
AND ed.equipment_type = 'other';

-- Motor Graders
UPDATE equipment_dimensions ed
SET equipment_type = 'motor_grader'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar motor graders (12x, 14x, 16x)
  (mk.name = 'Caterpillar' AND m.name ~* '^1[246]0$|^1[246][0-9][A-Z]')
  -- Komatsu GD series
  OR m.name ~* '^GD[0-9]'
  -- John Deere motor graders (6xxG)
  OR (mk.name = 'John Deere' AND m.name ~* '^6[0-9]{2}G$')
)
AND ed.equipment_type = 'other';

-- Rollers/Compactors
UPDATE equipment_dimensions ed
SET equipment_type = 'roller'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar rollers (CB, CS, CC series)
  (mk.name = 'Caterpillar' AND m.name ~* '^CB|^CS|^CC')
  -- Hamm rollers
  OR mk.name = 'Hamm'
  -- Dynapac rollers
  OR mk.name = 'Dynapac'
  -- BOMAG rollers
  OR mk.name = 'BOMAG'
  -- Sakai rollers
  OR mk.name = 'Sakai'
  -- Volvo rollers (DD, SD series)
  OR (mk.name = 'Volvo' AND m.name ~* '^DD|^SD')
)
AND ed.equipment_type = 'other';

-- Scrapers
UPDATE equipment_dimensions ed
SET equipment_type = 'scraper'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  -- Caterpillar scrapers (6xxG/H series)
  (mk.name = 'Caterpillar' AND m.name ~* '^6[0-9]{2}[GH]$')
)
AND ed.equipment_type = 'other';

-- Forklifts (general)
UPDATE equipment_dimensions ed
SET equipment_type = 'forklift'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  m.name ~* 'forklift|fork.?lift'
  OR mk.name ~* '^hyster$|^yale$|^crown$|^toyota.*forklift'
)
AND ed.equipment_type = 'other';

-- Cranes
UPDATE equipment_dimensions ed
SET equipment_type = 'crane'
FROM models m, makes mk
WHERE ed.model_id = m.id
AND m.make_id = mk.id
AND (
  m.name ~* 'crane'
  OR mk.name ~* '^grove$|^tadano$|^manitowoc$'
  OR (mk.name = 'Liebherr' AND m.name ~* '^LTM|^LTR|^LHM')
)
AND ed.equipment_type = 'other';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_equipment_dimensions_type ON equipment_dimensions(equipment_type);

-- Show summary of equipment types
SELECT equipment_type, COUNT(*) as count
FROM equipment_dimensions
GROUP BY equipment_type
ORDER BY count DESC;
