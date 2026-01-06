-- Fix Cedar Rapids: Merge all models into the original make
-- Run this in Supabase SQL Editor

-- Step 1: Find all Cedar Rapids makes
SELECT id, name FROM makes WHERE LOWER(name) LIKE '%cedar%rapids%' OR LOWER(name) LIKE '%cedarrapids%';

-- Step 2: The original Cedar Rapids make ID is: 0107d0c4-55ad-4b97-a1b9-955df20b0938
-- Move ALL models from any other Cedar Rapids make to this one

DO $$
DECLARE
    original_make_id UUID := '0107d0c4-55ad-4b97-a1b9-955df20b0938';
    other_make RECORD;
BEGIN
    -- Find other Cedar Rapids makes and move their models
    FOR other_make IN
        SELECT id FROM makes
        WHERE (LOWER(name) LIKE '%cedar%rapids%' OR LOWER(name) LIKE '%cedarrapids%')
        AND id != original_make_id
    LOOP
        -- Update models to point to the original make
        UPDATE models
        SET make_id = original_make_id
        WHERE make_id = other_make.id;

        -- Delete the duplicate make
        DELETE FROM makes WHERE id = other_make.id;

        RAISE NOTICE 'Merged make % into original', other_make.id;
    END LOOP;
END $$;

-- Step 3: Now add all the Cedar Rapids models directly to the original make
-- (in case the previous script's make was already deleted)

DO $$
DECLARE
    cedar_rapids_id UUID := '0107d0c4-55ad-4b97-a1b9-955df20b0938';
BEGIN
    -- JAW CRUSHERS
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JW33' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JW33');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JW42' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JW42');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JW55' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JW55');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC2036' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC2036');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC2236' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC2236');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC2436' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC2436');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC2540' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC2540');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC3042' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC3042');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC3054' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC3054');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC3248' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC3248');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC3255' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC3255');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'JC3648' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'JC3648');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRJ3042' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRJ3042');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRJ3255' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRJ3255');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRJ3868' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRJ3868');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MJ42' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MJ42');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MJ47' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MJ47');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MJ55' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MJ55');

    -- CONE CRUSHERS - MVP Series
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP280' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP280');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP380' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP380');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP380X' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP380X');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP450' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP450');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP450X' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP450X');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP550' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP550');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP550X' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP550X');

    -- CONE CRUSHERS - RC Series
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC36' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC36');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC45' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC45');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC45-II' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC45-II');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC46' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC46');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC46-II' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC46-II');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC54' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC54');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC54-II' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC54-II');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'RC54-III' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'RC54-III');

    -- CONE CRUSHERS - TC Series
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TC1000' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TC1000');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TC1150' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TC1150');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TC1300' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TC1300');

    -- CONE CRUSHERS - Portable/Modular
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRC1000' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRC1000');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRC1150' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRC1150');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRC1150S' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRC1150S');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MC380X' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MC380X');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MC450X' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MC450X');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MC1000' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MC1000');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MC1150' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MC1150');

    -- IMPACT CRUSHERS
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TI4143' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TI4143');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TI4250' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TI4250');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TI5057' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TI5057');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'IP1313' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'IP1313');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'IP1316' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'IP1316');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'IP2028' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'IP2028');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRH1111' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRH1111');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRH1113' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRH1113');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRH1313' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRH1313');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRI1313' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRI1313');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'I54' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'I54');

    -- SCREENS - Incline
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV3163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV3163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV4163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV4163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV5163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV5163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV5203' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV5203');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV6163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV6163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV6203' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV6203');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV6203-32' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV6203-32');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSV8203' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSV8203');

    -- SCREENS - Horizontal
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSH5163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSH5163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSH6163' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSH6163');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSH6203' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSH6203');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TSH8203' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TSH8203');

    -- SCREENS - Classic/Legacy
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '312' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '312');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '366' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '366');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '412' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '412');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '4x12' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '4x12');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '4x14' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '4x14');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '5x12' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '5x12');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '5x14' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '5x14');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '5x16' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '5x16');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '6x16' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '6x16');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '6x20' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '6x20');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '8x20' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '8x20');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'Vibrex 6x16' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'Vibrex 6x16');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'Vibrex 6x20' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'Vibrex 6x20');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'Vibrex 8x20' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'Vibrex 8x20');

    -- FEEDERS
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'VGF416' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'VGF416');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'VGF420' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'VGF420');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'VGF520' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'VGF520');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'VGF524' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'VGF524');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TF4260' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TF4260');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'TF5220' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'TF5220');

    -- PORTABLE PLANTS
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRJ3042 Portable' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRJ3042 Portable');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'CRJ3255 Portable' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'CRJ3255 Portable');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'MVP450 Portable' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'MVP450 Portable');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'C44 Portable Cone' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'C44 Portable Cone');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, 'C54II Portable Cone' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = 'C54II Portable Cone');

    -- HAMMERMILLS
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '4033 Hammermill' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '4033 Hammermill');
    INSERT INTO models (make_id, name) SELECT cedar_rapids_id, '4340 Hammermill' WHERE NOT EXISTS (SELECT 1 FROM models WHERE make_id = cedar_rapids_id AND name = '4340 Hammermill');

    RAISE NOTICE 'All Cedar Rapids models added to make ID: %', cedar_rapids_id;
END $$;

-- Verify: Count models for Cedar Rapids
SELECT 'Total Cedar Rapids models:' as info, COUNT(*) as count
FROM models WHERE make_id = '0107d0c4-55ad-4b97-a1b9-955df20b0938';

-- List first 20 models
SELECT name as model FROM models
WHERE make_id = '0107d0c4-55ad-4b97-a1b9-955df20b0938'
ORDER BY name
LIMIT 20;
