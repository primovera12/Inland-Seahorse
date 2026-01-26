-- ============================================================================
-- 043 - Seed All Truck Types from Hardcoded File
-- ============================================================================
-- Adds all 62 truck types from src/lib/load-planner/trucks.ts to database
-- Uses INSERT ON CONFLICT to avoid duplicates (matches on name)
-- ============================================================================

-- Add unique constraint on name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'truck_types_name_unique'
  ) THEN
    ALTER TABLE truck_types ADD CONSTRAINT truck_types_name_unique UNIQUE (name);
  END IF;
END $$;

-- Insert all truck types (ON CONFLICT DO UPDATE to refresh data)
INSERT INTO truck_types (
  name, category, description,
  deck_height_ft, deck_length_ft, deck_width_ft,
  well_length_ft, well_height_ft,
  max_cargo_weight_lbs, tare_weight_lbs,
  max_legal_cargo_height_ft, max_legal_cargo_width_ft,
  features, best_for, loading_method,
  is_active, sort_order
) VALUES
-- ===========================
-- FLATBED TRAILERS
-- ===========================
(
  'Flatbed 48''', 'FLATBED',
  'Standard 48-foot flatbed trailer. Most common and economical choice for freight that fits within legal dimensions.',
  5.0, 48, 8.5, NULL, NULL,
  48000, 15000, 8.5, 8.5,
  ARRAY['Most economical option', 'Widely available', 'Easy loading from sides', 'Standard tie-down points every 2 feet', 'Can add tarps for weather protection'],
  ARRAY['Steel coils and beams', 'Lumber and building materials', 'Machinery under 8.5'' tall', 'Palletized freight', 'Construction materials'],
  'crane', true, 1
),
(
  'Flatbed 53''', 'FLATBED',
  'Extended 53-foot flatbed for longer cargo. Maximum legal trailer length for standard operations.',
  5.0, 53, 8.5, NULL, NULL,
  45000, 16000, 8.5, 8.5,
  ARRAY['5 extra feet of deck space', 'Good for longer loads', 'Same height as 48'' flatbed', 'Standard tie-down points'],
  ARRAY['Long steel beams', 'Extended machinery', 'Multiple items requiring extra length', 'Pipe and tubing'],
  'crane', true, 2
),
(
  'Stretch Flatbed', 'FLATBED',
  'Extendable flatbed that can stretch from 48'' to 80'' or more for extra-long loads. Requires oversize permits when extended.',
  5.0, 80, 8.5, NULL, NULL,
  43000, 18000, 8.5, 8.5,
  ARRAY['Extends from 48'' to 80''+', 'For extra-long cargo', 'Telescoping design', 'Requires oversize permits when stretched'],
  ARRAY['Wind turbine blades', 'Long structural steel', 'Bridge beams', 'Utility poles', 'Long pipe strings'],
  'crane', true, 3
),
(
  'Hotshot 40''', 'FLATBED',
  'Gooseneck flatbed pulled by heavy-duty pickup (Class 3-5). Faster, more economical for lighter loads.',
  3.5, 40, 8.5, NULL, NULL,
  16500, 7000, 10.0, 8.5,
  ARRAY['Quick dispatch', 'Lower cost than full-size', 'Fits in tighter spaces', 'Lower deck than standard flatbed'],
  ARRAY['LTL (Less Than Truckload)', 'Time-critical small loads', 'Farm equipment', 'Small construction equipment', 'Vehicles'],
  'drive-on', true, 4
),
(
  'Flatbed with Moffett', 'FLATBED',
  'Standard flatbed with mounted Moffett forklift for self-unloading at delivery sites without dock access.',
  5.0, 48, 8.5, NULL, NULL,
  42000, 21000, 8.5, 8.5,
  ARRAY['Mounted Moffett forklift', 'Self-unloading capability', 'No dock required at delivery', 'Forklift capacity 5,000-8,000 lbs'],
  ARRAY['Building materials to job sites', 'Deliveries without forklift access', 'Roofing materials', 'Lumber yards', 'Multi-stop deliveries'],
  'forklift', true, 5
),
(
  'Flatbed with Piggyback', 'FLATBED',
  'Flatbed with attachable/detachable forklift. More flexible than Moffett.',
  5.0, 48, 8.5, NULL, NULL,
  44000, 19000, 8.5, 8.5,
  ARRAY['Detachable piggyback forklift', 'More cargo capacity when forklift not needed', 'Versatile delivery options', 'Can be left at job site'],
  ARRAY['Flexible delivery requirements', 'When forklift may or may not be needed', 'Construction sites', 'Agricultural deliveries'],
  'forklift', true, 6
),
(
  'Aluminum Flatbed', 'FLATBED',
  'Lightweight aluminum construction for maximum payload capacity.',
  5.0, 48, 8.5, NULL, NULL,
  52000, 11000, 8.5, 8.5,
  ARRAY['Lightweight aluminum construction', 'Maximum payload capacity', 'Corrosion resistant', 'Better fuel economy'],
  ARRAY['Maximum weight loads', 'Heavy commodities', 'Steel coils (maximizing payload)', 'When every pound counts'],
  'crane', true, 7
),
(
  'Combo Flatbed/Step Deck', 'FLATBED',
  'Convertible trailer that works as flatbed or step deck. Flip-down front section.',
  5.0, 48, 8.5, 37, NULL,
  45000, 17000, 8.5, 8.5,
  ARRAY['Converts from flatbed to step deck', 'Flip-down front section', 'Maximum versatility', 'Two trailers in one'],
  ARRAY['Mixed cargo requirements', 'Varying height loads', 'Maximum fleet flexibility', 'Owner-operators'],
  'crane', true, 8
),

-- ===========================
-- STEP DECK TRAILERS
-- ===========================
(
  'Step Deck 48''', 'STEP_DECK',
  'Standard step deck with upper deck (11'') and lower main deck (37''). Lower deck height allows taller cargo.',
  3.5, 48, 8.5, 37, NULL,
  48000, 16000, 10.0, 8.5,
  ARRAY['Lower deck height (3.5'' vs 5'')', 'Drive-on capability with ramps', 'Upper deck for smaller items', 'Good balance of height and capacity'],
  ARRAY['Forklifts and small equipment', 'Cargo 8.5'' to 10'' tall', 'Vehicles that can drive on', 'Agricultural equipment', 'Scissor lifts and aerial lifts'],
  'drive-on', true, 10
),
(
  'Step Deck 53''', 'STEP_DECK',
  'Extended 53-foot step deck with more deck space. Upper deck (11'') and lower main deck (42'').',
  3.5, 53, 8.5, 42, NULL,
  46000, 17000, 10.0, 8.5,
  ARRAY['53'' overall length', 'Longer lower deck section', 'Drive-on capability', 'More versatile for longer equipment'],
  ARRAY['Longer equipment up to 10'' tall', 'Multiple pieces of machinery', 'Extended agricultural equipment', 'Construction vehicles'],
  'drive-on', true, 11
),
(
  'Low Pro Step Deck', 'STEP_DECK',
  'Low profile step deck with reduced deck height for taller cargo. Uses low-profile tires.',
  2.5, 48, 8.5, 37, NULL,
  44000, 17000, 11.0, 8.5,
  ARRAY['Extra-low deck (2.5'')', 'Uses low-profile tires', 'Maximum legal cargo height', 'Drive-on with ramps'],
  ARRAY['Cargo 10'' to 11'' tall', 'Tall equipment that fits legally', 'Borderline oversize loads', 'Maximizing legal height'],
  'drive-on', true, 12
),
(
  'Stretch Step Deck', 'STEP_DECK',
  'Extendable step deck for tall and long cargo. Can stretch from 48'' to 65''+ as needed.',
  3.5, 65, 8.5, 50, NULL,
  43000, 19000, 10.0, 8.5,
  ARRAY['Extendable deck', 'For tall + long cargo', 'Lower deck than flatbed', 'Versatile for oversized loads'],
  ARRAY['Long and tall equipment', 'Extended agricultural machines', 'Crane booms', 'Long industrial equipment'],
  'drive-on', true, 13
),
(
  'Step Deck with Ramps', 'STEP_DECK',
  'Step deck with heavy-duty built-in ramps for drive-on loading.',
  3.5, 48, 8.5, 37, NULL,
  46000, 18000, 10.0, 8.5,
  ARRAY['Heavy-duty built-in ramps', 'Drive-on loading standard', 'Ramps rated for 30,000+ lbs', 'Spring-assist ramp lift'],
  ARRAY['Self-propelled equipment', 'Forklifts and telehandlers', 'Agricultural equipment', 'Rolling stock'],
  'drive-on', true, 14
),
(
  'Drop Deck Combo', 'STEP_DECK',
  'Adjustable deck height step deck with removable upper deck section.',
  3.0, 48, 8.5, 40, NULL,
  44000, 18000, 10.5, 8.5,
  ARRAY['Removable upper deck section', 'Adjustable deck height', 'Extended well length when converted', 'Multiple configuration options'],
  ARRAY['Variable height cargo', 'Maximizing well length', 'Mixed loads', 'Versatile operations'],
  'drive-on', true, 15
),

-- ===========================
-- RGN (REMOVABLE GOOSENECK)
-- ===========================
(
  'RGN 2-Axle', 'RGN',
  'Standard 2-axle removable gooseneck with very low deck. Gooseneck detaches for front-loading.',
  2.0, 48, 8.5, 29, 2.0,
  42000, 20000, 11.5, 8.5,
  ARRAY['Very low deck height (2'')', 'Detachable gooseneck for drive-on loading', 'Ideal for tracked equipment', 'Can handle tall machinery', 'Hydraulic detach system'],
  ARRAY['Excavators and dozers', 'Tracked equipment', 'Tall machinery (10''-11.5'')', 'Equipment that must drive on', 'Cranes and heavy construction equipment'],
  'drive-on', true, 20
),
(
  'RGN 3-Axle', 'RGN',
  'Heavy-duty 3-axle RGN for heavier loads. Same low deck height with increased weight capacity.',
  2.0, 48, 8.5, 29, 2.0,
  52000, 22000, 11.5, 8.5,
  ARRAY['Extra axle for heavier loads', 'Same low deck as standard RGN', 'Better weight distribution', 'Higher capacity for heavy equipment'],
  ARRAY['Heavy excavators (CAT 330+)', 'Large dozers', 'Mining equipment', 'Heavy tracked machinery'],
  'drive-on', true, 21
),
(
  'RGN 4-Axle', 'RGN',
  'Extra heavy-duty 4-axle RGN for the heaviest tracked equipment. Maximum weight distribution.',
  2.0, 48, 8.5, 29, 2.0,
  65000, 26000, 11.5, 8.5,
  ARRAY['4 axles for maximum weight', 'Heaviest legal capacity', 'Excellent weight distribution', 'Low deck for tall equipment'],
  ARRAY['Heaviest excavators (CAT 390+)', 'Mining haul trucks', 'Large cranes', 'Extreme heavy equipment'],
  'drive-on', true, 22
),
(
  'Stretch RGN', 'RGN',
  'Extendable RGN for long and tall heavy equipment. Stretches from 48'' to 65''+ for oversized loads.',
  2.0, 65, 8.5, 45, 2.0,
  48000, 24000, 11.5, 8.5,
  ARRAY['Extendable deck length', 'Low deck height maintained', 'Drive-on capability', 'For long, tall, heavy equipment'],
  ARRAY['Long-reach excavators', 'Crane booms on equipment', 'Mining equipment with attachments', 'Extended drilling equipment'],
  'drive-on', true, 23
),
(
  'Mini RGN', 'RGN',
  'Compact removable gooseneck for smaller equipment. Perfect for skid steers and mini excavators.',
  1.5, 35, 8.5, 20, 1.5,
  25000, 12000, 12.0, 8.5,
  ARRAY['Compact size', 'Very low deck height', 'Detachable gooseneck', 'Perfect for compact equipment'],
  ARRAY['Compact excavators', 'Skid steers', 'Mini loaders', 'Small tracked equipment', 'Compact track loaders (CTL)'],
  'drive-on', true, 24
),
(
  'Extendable RGN 80''', 'RGN',
  'Heavy-duty extendable RGN that can stretch to 80 feet for very long equipment.',
  2.0, 80, 8.5, 60, 2.0,
  45000, 26000, 11.5, 8.5,
  ARRAY['Extends from 48'' to 80''', 'Detachable gooseneck', 'Multiple axle configurations', 'For very long equipment'],
  ARRAY['Long-reach excavators', 'Extended cranes', 'Drilling equipment', 'Long industrial machinery'],
  'drive-on', true, 25
),

-- ===========================
-- LOWBOY TRAILERS
-- ===========================
(
  'Lowboy 2-Axle', 'LOWBOY',
  'Standard lowboy with lowest deck height available (1.5''). Fixed gooseneck, requires crane loading.',
  1.5, 48, 8.5, 24, 1.5,
  40000, 20000, 12.0, 8.5,
  ARRAY['Lowest deck height available (1.5'')', 'Maximum cargo height clearance', 'Very stable for tall loads', 'Fixed gooseneck (stronger)'],
  ARRAY['Tallest equipment (11.5''-12'')', 'Large transformers', 'Oversized industrial equipment', 'Crane components', 'Wind turbine parts'],
  'crane', true, 30
),
(
  'Lowboy 3-Axle', 'LOWBOY',
  'Heavy-duty lowboy with 3 axles for heavier tall loads. Maximum capacity for standard lowboy.',
  1.5, 48, 8.5, 24, 1.5,
  55000, 25000, 12.0, 8.5,
  ARRAY['Maximum weight capacity', 'Lowest deck for tallest cargo', '3 axles for weight distribution', 'Most versatile for oversize loads'],
  ARRAY['Heaviest tall equipment', 'Large transformers', 'Mining equipment', 'Superload candidates'],
  'crane', true, 31
),
(
  'Lowboy 4-Axle', 'LOWBOY',
  'Extra heavy-duty 4-axle lowboy for the heaviest tall loads. Used for superloads.',
  1.5, 48, 8.5, 24, 1.5,
  70000, 30000, 12.0, 8.5,
  ARRAY['4 axles for extreme weight', 'Superload capable', 'Best weight distribution', 'Lowest deck available'],
  ARRAY['Power transformers', 'Nuclear components', 'Heavy industrial equipment', 'Bridge sections'],
  'crane', true, 32
),
(
  'Detachable Lowboy', 'LOWBOY',
  'Lowboy with detachable gooseneck for drive-on loading. Combines low deck with loading flexibility.',
  1.8, 48, 8.5, 26, 1.8,
  45000, 22000, 11.7, 8.5,
  ARRAY['Detachable gooseneck', 'Drive-on loading option', 'Nearly as low as fixed lowboy', 'More versatile than fixed'],
  ARRAY['Tall tracked equipment', 'Equipment that can drive on', 'When crane not available', 'Versatile heavy loads'],
  'drive-on', true, 33
),
(
  'Stretch Lowboy', 'LOWBOY',
  'Extendable lowboy for long and very tall cargo. Can extend deck length significantly.',
  1.5, 65, 8.5, 40, 1.5,
  50000, 28000, 12.0, 8.5,
  ARRAY['Extendable deck', 'Lowest deck height', 'For long + very tall cargo', 'Maximum height clearance'],
  ARRAY['Long transformers', 'Extended tall equipment', 'Reactor vessels', 'Long industrial tanks'],
  'crane', true, 34
),
(
  'Hydraulic Lowboy', 'LOWBOY',
  'Lowboy with hydraulic deck raise/lower for flexible loading and dock access.',
  1.5, 48, 8.5, 28, 1.5,
  48000, 26000, 12.0, 8.5,
  ARRAY['Hydraulic deck raise/lower', 'Can adjust from 1.5'' to 3.0''', 'Dock loading capability', 'Maximum flexibility'],
  ARRAY['Variable height requirements', 'Dock loading situations', 'When height adjustment needed', 'Multi-purpose operations'],
  'crane', true, 35
),
(
  'Oil Field Lowboy', 'LOWBOY',
  'Heavy-duty lowboy designed for oil field equipment with extra reinforcement.',
  1.5, 50, 10.0, 30, 1.5,
  75000, 32000, 12.0, 10.0,
  ARRAY['Extra-wide deck (10'')', 'Heavy-duty construction', 'Designed for drilling equipment', 'Reinforced for concentrated loads'],
  ARRAY['Drilling rigs', 'Oil field compressors', 'Frac equipment', 'Pipeline equipment'],
  'crane', true, 36
),

-- ===========================
-- DOUBLE DROP TRAILERS
-- ===========================
(
  'Double Drop', 'DOUBLE_DROP',
  'Three-level trailer with low center well. Combines height advantage with length for tall, long cargo.',
  2.0, 48, 8.5, 25, 2.0,
  45000, 18000, 11.5, 8.5,
  ARRAY['Low center well section', 'Front and rear decks for smaller items', 'Good for tall + long machinery', 'Versatile loading options'],
  ARRAY['Tall machinery with length', 'Industrial generators', 'Large compressors', 'Processing equipment'],
  'crane', true, 40
),
(
  'Stretch Double Drop', 'DOUBLE_DROP',
  'Extendable double drop for extra-long tall cargo. Well section can extend significantly.',
  2.0, 65, 8.5, 40, 2.0,
  42000, 21000, 11.5, 8.5,
  ARRAY['Extendable well section', 'Low center deck', 'For extra-long tall cargo', 'Multiple deck levels'],
  ARRAY['Long industrial equipment', 'Extended tanks and vessels', 'Large generator packages', 'Mining equipment'],
  'crane', true, 41
),
(
  'Double Drop with Beavertail', 'DOUBLE_DROP',
  'Double drop with beavertail ramp for drive-on loading of self-propelled equipment.',
  2.0, 48, 8.5, 25, 2.0,
  43000, 19000, 11.5, 8.5,
  ARRAY['Beavertail rear ramp', 'Drive-on loading', 'Low center well', 'Self-propelled equipment capable'],
  ARRAY['Self-propelled equipment', 'Rolling stock', 'Tall wheeled machinery', 'When crane not available'],
  'drive-on', true, 42
),

-- ===========================
-- LANDOLL (TILT BED)
-- ===========================
(
  'Landoll (Tilt Bed)', 'LANDOLL',
  'Self-loading tilt bed trailer. Tilts and slides for ground-level loading without ramps or cranes.',
  2.5, 48, 8.5, NULL, NULL,
  50000, 18000, 11.0, 8.5,
  ARRAY['Self-loading capability', 'Tilts to ground level', 'No external equipment needed', 'Fast loading/unloading', 'Hydraulic tilt and slide'],
  ARRAY['Containers', 'Equipment without crane access', 'Remote locations', 'Quick turnaround loads', 'Vehicles and small equipment'],
  'tilt', true, 50
),
(
  'Landoll 50'' (Extended)', 'LANDOLL',
  'Extended 50-foot Landoll tilt bed for longer cargo that doesn''t require crane loading.',
  2.5, 50, 8.5, NULL, NULL,
  48000, 20000, 11.0, 8.5,
  ARRAY['Extended 50'' deck', 'Self-loading capability', 'Tilts to ground level', 'No external equipment needed'],
  ARRAY['Long containers', 'Extended equipment', 'Remote locations', 'Long loads without crane'],
  'tilt', true, 51
),

-- ===========================
-- CONESTOGA
-- ===========================
(
  'Conestoga', 'CONESTOGA',
  'Flatbed with retractable tarp system. Provides weather protection while maintaining flatbed flexibility.',
  5.0, 48, 8.5, NULL, NULL,
  44000, 17000, 8.5, 8.5,
  ARRAY['Built-in tarp system', 'Weather protection', 'Side loading capability', 'Quick tarp deployment', 'No manual tarping required'],
  ARRAY['Weather-sensitive cargo', 'Paper products', 'Food-grade freight', 'Finished goods needing protection', 'Electronics and machinery'],
  'forklift', true, 55
),

-- ===========================
-- DRY VAN
-- ===========================
(
  'Dry Van 48''', 'DRY_VAN',
  'Standard enclosed 48-foot trailer. Common for general freight.',
  4.0, 48, 8.0, NULL, NULL,
  44000, 14000, 9.0, 8.0,
  ARRAY['Fully enclosed', 'Weather protection', 'Secure from theft', 'Rear door loading'],
  ARRAY['General freight', 'Palletized goods', 'Consumer products', 'Retail merchandise'],
  'forklift', true, 60
),
(
  'Dry Van 53''', 'DRY_VAN',
  'Standard enclosed 53-foot trailer. Most common trailer in the US for general freight.',
  4.0, 53, 8.5, NULL, NULL,
  45000, 15000, 9.0, 8.0,
  ARRAY['Fully enclosed', 'Weather protection', 'Secure from theft', 'Rear door loading', 'Air ride suspension'],
  ARRAY['General freight', 'Palletized goods', 'Consumer products', 'Retail merchandise', 'Non-temperature sensitive goods'],
  'forklift', true, 61
),

-- ===========================
-- REEFER (REFRIGERATED)
-- ===========================
(
  'Reefer 48'' (Refrigerated)', 'REEFER',
  'Temperature-controlled 48-foot trailer for perishable goods.',
  4.0, 48, 8.0, NULL, NULL,
  42000, 16000, 8.5, 8.0,
  ARRAY['Temperature controlled', 'Multi-temp capability', 'GPS temperature monitoring', 'Insulated walls'],
  ARRAY['Frozen foods', 'Fresh produce', 'Pharmaceuticals', 'Temperature-sensitive chemicals'],
  'forklift', true, 65
),
(
  'Reefer 53'' (Refrigerated)', 'REEFER',
  'Temperature-controlled 53-foot trailer. Maintains cargo at specified temperature.',
  4.0, 53, 8.5, NULL, NULL,
  43000, 17000, 8.5, 8.0,
  ARRAY['Temperature controlled', 'Multi-temp capability', 'GPS temperature monitoring', 'Insulated walls', 'Continuous cooling'],
  ARRAY['Frozen foods', 'Fresh produce', 'Pharmaceuticals', 'Temperature-sensitive chemicals', 'Dairy products'],
  'forklift', true, 66
),

-- ===========================
-- CURTAIN SIDE
-- ===========================
(
  'Curtain Side (Side Kit)', 'CURTAIN_SIDE',
  'Flatbed with curtain side walls. Easy side access with weather protection.',
  5.0, 48, 8.5, NULL, NULL,
  44000, 16000, 8.5, 8.5,
  ARRAY['Side curtain walls', 'Easy side access', 'Weather protection', 'Quick loading/unloading', 'Forklift accessible from sides'],
  ARRAY['Beverages', 'Building materials', 'Packaged goods', 'Quick-turn freight', 'Multi-stop deliveries'],
  'forklift', true, 70
),

-- ===========================
-- MULTI-AXLE HEAVY HAUL
-- ===========================
(
  'Multi-Axle 9-Line', 'MULTI_AXLE',
  '9-axle heavy haul trailer for superloads. Bridge between standard and extreme heavy haul.',
  2.5, 50, 10.0, 35, 2.5,
  120000, 45000, 11.0, 10.0,
  ARRAY['9 axle lines', 'Heavy haul capacity', 'Hydraulic steering', 'Police escort typically required'],
  ARRAY['Heavy industrial equipment', 'Medium transformers', 'Large machinery', 'Mining equipment'],
  'crane', true, 75
),
(
  'Multi-Axle 13-Line', 'MULTI_AXLE',
  '13-axle trailer for superloads. Used for the heaviest industrial equipment and transformers.',
  2.5, 60, 12.0, 45, 2.5,
  200000, 60000, 11.0, 12.0,
  ARRAY['13 axle lines', 'Extreme weight capacity', 'Hydraulic steering', 'Height adjustable', 'Police escort required'],
  ARRAY['Large power transformers', 'Reactor vessels', 'Turbines', 'Heavy industrial equipment', 'Bridge sections'],
  'crane', true, 76
),
(
  'Multi-Axle 19-Line', 'MULTI_AXLE',
  '19-axle trailer for the heaviest superloads. Maximum weight distribution for extreme loads.',
  2.5, 80, 14.0, 60, 2.5,
  350000, 90000, 11.0, 14.0,
  ARRAY['19 axle lines', 'Maximum weight capacity', 'Computer-controlled steering', 'Self-propelled option', 'Multiple escort vehicles required'],
  ARRAY['Nuclear reactor components', 'Largest transformers', 'Refinery equipment', 'Offshore platform modules', 'Ship components'],
  'crane', true, 77
),
(
  'Jeep and Dolly Combination', 'MULTI_AXLE',
  'Jeep (front) and dolly (rear) axle set to extend weight capacity of standard trailers.',
  2.0, 48, 8.5, 29, 2.0,
  80000, 35000, 11.5, 8.5,
  ARRAY['Adds axles to standard trailer', 'Jeep adds 2 axles in front', 'Dolly adds 2-3 axles in rear', 'Increases weight capacity'],
  ARRAY['Heavy equipment exceeding standard limits', 'Large excavators', 'Heavy mining equipment', 'Transformers on standard trailers'],
  'crane', true, 78
),

-- ===========================
-- SPECIALIZED TRAILERS
-- ===========================
(
  'Schnabel Trailer', 'SCHNABEL',
  'Specialized trailer where cargo becomes part of the trailer structure. For the heaviest single-piece loads.',
  3.0, 100, 16.0, 60, 3.0,
  500000, 100000, 10.5, 16.0,
  ARRAY['Cargo is part of trailer', 'Extreme weight capacity', 'Modular configuration', 'Self-propelled modules', 'Maximum flexibility'],
  ARRAY['Largest transformers', 'Pressure vessels', 'Nuclear components', 'Heavy refinery equipment', 'Single-piece extreme loads'],
  'crane', true, 80
),
(
  'Perimeter / Beam Trailer', 'PERIMETER',
  'Open frame trailer with no deck. Cargo sits between frame beams for maximum clearance.',
  1.0, 48, 10.0, 35, 1.0,
  60000, 25000, 12.5, 10.0,
  ARRAY['No solid deck', 'Maximum height clearance', 'Cargo between beams', 'For extremely tall loads', 'Adjustable beam width'],
  ARRAY['Extremely tall equipment', 'Tall tanks and vessels', 'Oversized generators', 'Maximum height loads'],
  'crane', true, 81
),
(
  'Steerable Dolly Trailer', 'STEERABLE',
  'Trailer with steerable rear axles for tight turns. Essential for long loads in urban areas.',
  2.0, 53, 8.5, 40, 2.0,
  48000, 22000, 11.5, 8.5,
  ARRAY['Rear axle steering', 'Better maneuverability', 'Tighter turning radius', 'Rear steer operator', 'For congested areas'],
  ARRAY['Long loads in cities', 'Tight delivery locations', 'Wind turbine components', 'Construction in urban areas'],
  'crane', true, 82
),
(
  'Blade Trailer (Wind Turbine)', 'BLADE',
  'Specialized trailer for wind turbine blades. Adaptable for blades 150''+.',
  4.0, 180, 8.5, NULL, NULL,
  30000, 25000, 9.5, 8.5,
  ARRAY['Blade-specific cradle', 'Pivoting support', 'Self-steering rear', 'For blades 150''+', 'GPS tracking for route'],
  ARRAY['Wind turbine blades', 'Long composite structures', 'Aerospace components'],
  'crane', true, 83
),
(
  'Tower Section Trailer', 'SPECIALIZED',
  'Specialized trailer for wind turbine tower sections and large cylindrical loads.',
  3.0, 60, 12.0, NULL, NULL,
  80000, 30000, 10.5, 12.0,
  ARRAY['Tower section cradles', 'Wide deck for cylindrical loads', 'Heavy-duty tie-downs', 'Oversize permits typically required'],
  ARRAY['Wind turbine tower sections', 'Large pipe', 'Cylindrical tanks', 'Large diameter loads'],
  'crane', true, 84
),
(
  'Nacelle Trailer', 'SPECIALIZED',
  'Purpose-built trailer for wind turbine nacelles and generator housings.',
  3.5, 45, 12.0, NULL, NULL,
  100000, 35000, 10.0, 12.0,
  ARRAY['Nacelle-specific mounting', 'Extra-wide deck', 'Heavy-duty capacity', 'Specialized securing points'],
  ARRAY['Wind turbine nacelles', 'Generator housings', 'Large rectangular loads', 'Heavy equipment housings'],
  'crane', true, 85
),
(
  'SPMT (Self-Propelled Modular Transporter)', 'SPECIALIZED',
  'Self-propelled modular platform trailers for the largest and heaviest loads. Can be combined for extreme capacity.',
  1.5, 100, 20.0, 100, 1.5,
  800000, 150000, 12.0, 20.0,
  ARRAY['Self-propelled - no tractor required', 'Modular - add units for more capacity', 'All-wheel steering', 'Computer-controlled positioning', 'Hydraulic height adjustment', 'Can move in any direction'],
  ARRAY['Refinery modules', 'Bridge sections', 'Building relocations', 'Ship components', 'Offshore platform modules', 'Nuclear components'],
  'crane', true, 86
),
(
  'Double-Wide Flatbed', 'SPECIALIZED',
  'Extra-wide flatbed for oversize loads that exceed standard width limits. Requires permits.',
  5.0, 48, 12.0, NULL, NULL,
  44000, 18000, 8.5, 12.0,
  ARRAY['Extra-wide deck (12'')', 'For width-oversize loads', 'Pilot/escort cars required', 'State permits required'],
  ARRAY['Wide industrial equipment', 'Pre-fabricated building sections', 'Wide agricultural equipment', 'Manufacturing equipment'],
  'crane', true, 87
),
(
  'Auto Carrier 8-Car', 'SPECIALIZED',
  'Standard auto transport carrier for 8-10 vehicles. Hydraulic ramps for loading.',
  3.5, 75, 8.5, NULL, NULL,
  48000, 22000, 10.0, 8.5,
  ARRAY['Multi-level vehicle transport', 'Hydraulic ramps', 'Adjustable deck positions', 'Fits 8-10 standard cars'],
  ARRAY['Car dealership deliveries', 'Auction transport', 'Fleet vehicles', 'Consumer vehicle transport'],
  'drive-on', true, 88
),
(
  'Wedge Auto Carrier', 'SPECIALIZED',
  'Wedge-style enclosed auto carrier for high-value vehicles.',
  3.0, 53, 8.5, NULL, NULL,
  25000, 18000, 10.5, 8.5,
  ARRAY['Enclosed protection', 'Climate controlled options', 'Fits 4-6 vehicles', 'Hydraulic lift gate'],
  ARRAY['Exotic cars', 'Classic vehicles', 'High-value automobiles', 'Auction-quality transport'],
  'drive-on', true, 89
),
(
  'Heavy Equipment Float', 'SPECIALIZED',
  'Reinforced flatbed designed for very heavy concentrated loads. Extra reinforced deck.',
  4.5, 48, 8.5, NULL, NULL,
  60000, 20000, 9.0, 8.5,
  ARRAY['Reinforced deck structure', 'Higher concentrated load capacity', 'Heavy-duty tie-downs', 'Designed for equipment with tracks'],
  ARRAY['Tracked excavators', 'Bulldozers', 'Heavy industrial equipment', 'Concentrated heavy loads'],
  'drive-on', true, 90
),
(
  'Expandable Width Flatbed', 'SPECIALIZED',
  'Flatbed with expandable width capability for extra-wide loads.',
  5.0, 48, 10.0, NULL, NULL,
  42000, 19000, 8.5, 10.0,
  ARRAY['Width expands from 8.5'' to 10''', 'Hydraulic expansion', 'For moderately wide loads', 'More economical than double-wide'],
  ARRAY['Wide but not extreme loads', 'Farm equipment', 'Industrial tanks', 'Pre-cast concrete sections'],
  'crane', true, 91
),
(
  'Beam Hauler Trailer', 'SPECIALIZED',
  'Specialized trailer for very long structural beams and bridge girders.',
  5.0, 120, 8.5, NULL, NULL,
  50000, 30000, 8.5, 8.5,
  ARRAY['Steerable rear axle', 'Designed for long beams', 'Support bolsters included', 'Up to 120'' cargo'],
  ARRAY['Bridge girders', 'Structural steel beams', 'Long pipe strings', 'Utility poles'],
  'crane', true, 92
),
(
  'Pole Trailer (Logging)', 'SPECIALIZED',
  'Traditional pole trailer for logs and long timber products.',
  4.0, 65, 8.5, NULL, NULL,
  55000, 18000, 9.5, 8.5,
  ARRAY['Pole connection between tractor and trailer', 'Adjustable length', 'Stakes for log containment', 'Self-loading options available'],
  ARRAY['Sawlogs', 'Timber products', 'Utility poles', 'Long pipe'],
  'crane', true, 93
),
(
  'Livestock Trailer', 'SPECIALIZED',
  'Ventilated trailer for safe transport of cattle, hogs, and other livestock.',
  8.0, 53, 8.5, NULL, NULL,
  48000, 18000, 5.5, 8.5,
  ARRAY['Ventilated sides', 'Multiple deck levels', 'Non-slip flooring', 'Loading ramps'],
  ARRAY['Cattle transport', 'Hog hauling', 'Livestock to market', 'Agricultural animals'],
  'drive-on', true, 94
),

-- ===========================
-- TANKER TRAILERS
-- ===========================
(
  'Liquid Tanker', 'TANKER',
  'Standard tanker for liquid commodities including fuel, chemicals, and food-grade liquids.',
  8.0, 42, 8.0, NULL, NULL,
  50000, 12000, 5.5, 8.0,
  ARRAY['Liquid cargo transport', 'Multiple compartments available', 'Food-grade options', 'Hazmat certified options'],
  ARRAY['Fuel transport', 'Chemicals', 'Food-grade liquids', 'Industrial liquids'],
  'pump', true, 100
),
(
  'Pneumatic Tanker', 'TANKER',
  'Pressurized tanker for dry bulk commodities that discharge via air pressure.',
  10.0, 42, 8.0, NULL, NULL,
  48000, 14000, 3.5, 8.0,
  ARRAY['Pneumatic discharge', 'Sealed transport', 'Food-grade options', 'Rapid unloading'],
  ARRAY['Cement', 'Flour', 'Plastic pellets', 'Dry bulk commodities'],
  'pneumatic', true, 101
),

-- ===========================
-- HOPPER / DUMP TRAILERS
-- ===========================
(
  'Hopper Bottom', 'HOPPER',
  'Gravity-discharge trailer for agricultural products and bulk materials.',
  10.0, 42, 8.0, NULL, NULL,
  55000, 13000, 3.5, 8.0,
  ARRAY['Gravity discharge', 'Double or triple hopper', 'Easy unloading', 'Agricultural standard'],
  ARRAY['Grain', 'Sand', 'Gravel', 'Agricultural products'],
  'gravity', true, 105
),
(
  'End Dump Trailer', 'HOPPER',
  'Hydraulic dump trailer for bulk materials and construction debris.',
  6.0, 38, 8.0, NULL, NULL,
  50000, 15000, 7.5, 8.0,
  ARRAY['Hydraulic dump', 'Rapid unloading', 'Heavy-duty construction', 'High sides available'],
  ARRAY['Construction debris', 'Aggregates', 'Scrap metal', 'Demolition materials'],
  'dump', true, 106
),
(
  'Side Dump Trailer', 'HOPPER',
  'Hydraulic side-dumping trailer for materials requiring lateral discharge.',
  5.5, 40, 8.5, NULL, NULL,
  52000, 14000, 8.0, 8.5,
  ARRAY['Side-dumping capability', 'Faster unloading than end dump', 'Can dump while moving', 'Better stability than end dump'],
  ARRAY['Road construction', 'Mining operations', 'Aggregates', 'Large stockpile building'],
  'dump', true, 107
)

ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  deck_height_ft = EXCLUDED.deck_height_ft,
  deck_length_ft = EXCLUDED.deck_length_ft,
  deck_width_ft = EXCLUDED.deck_width_ft,
  well_length_ft = EXCLUDED.well_length_ft,
  well_height_ft = EXCLUDED.well_height_ft,
  max_cargo_weight_lbs = EXCLUDED.max_cargo_weight_lbs,
  tare_weight_lbs = EXCLUDED.tare_weight_lbs,
  max_legal_cargo_height_ft = EXCLUDED.max_legal_cargo_height_ft,
  max_legal_cargo_width_ft = EXCLUDED.max_legal_cargo_width_ft,
  features = EXCLUDED.features,
  best_for = EXCLUDED.best_for,
  loading_method = EXCLUDED.loading_method,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded 62 truck types';
END $$;
