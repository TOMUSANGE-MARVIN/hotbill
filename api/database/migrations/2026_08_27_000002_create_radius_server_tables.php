<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The two remaining tables of the standard FreeRADIUS SQL schema that the app
 * didn't already have. FreeRADIUS's post-auth logging writes radpostauth; the
 * nas table lists RADIUS clients (we actually authorise routers via a wildcard
 * client, but the module still expects the table to exist).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('radpostauth')) {
            DB::statement("
                CREATE TABLE radpostauth (
                    id bigint unsigned NOT NULL auto_increment,
                    username varchar(64) NOT NULL default '',
                    pass varchar(64) NOT NULL default '',
                    reply varchar(32) NOT NULL default '',
                    authdate timestamp NOT NULL default current_timestamp(),
                    class varchar(64) default NULL,
                    PRIMARY KEY (id),
                    KEY username (username)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        }

        if (!Schema::hasTable('nas')) {
            DB::statement("
                CREATE TABLE nas (
                    id int(10) NOT NULL auto_increment,
                    nasname varchar(128) NOT NULL,
                    shortname varchar(32) default NULL,
                    type varchar(30) default 'other',
                    ports int(5) default NULL,
                    secret varchar(60) default 'secret',
                    server varchar(64) default NULL,
                    community varchar(50) default NULL,
                    description varchar(200) default 'RADIUS Client',
                    PRIMARY KEY (id),
                    KEY nasname (nasname)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('radpostauth');
        Schema::dropIfExists('nas');
    }
};
