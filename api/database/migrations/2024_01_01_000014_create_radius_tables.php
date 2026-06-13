<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// FreeRADIUS-compatible schema (mod_sql uses these exact table names)
return new class extends Migration {
    public function up(): void
    {
        Schema::create('radcheck', function (Blueprint $table) {
            $table->id();
            $table->string('username', 64)->default('')->index();
            $table->string('attribute', 64)->default('');
            $table->string('op', 2)->default('==');
            $table->string('value', 253)->default('');
        });

        Schema::create('radreply', function (Blueprint $table) {
            $table->id();
            $table->string('username', 64)->default('')->index();
            $table->string('attribute', 64)->default('');
            $table->string('op', 2)->default('=');
            $table->string('value', 253)->default('');
        });

        Schema::create('radgroupcheck', function (Blueprint $table) {
            $table->id();
            $table->string('groupname', 64)->default('')->index();
            $table->string('attribute', 64)->default('');
            $table->string('op', 2)->default('==');
            $table->string('value', 253)->default('');
        });

        Schema::create('radgroupreply', function (Blueprint $table) {
            $table->id();
            $table->string('groupname', 64)->default('')->index();
            $table->string('attribute', 64)->default('');
            $table->string('op', 2)->default('=');
            $table->string('value', 253)->default('');
        });

        Schema::create('radusergroup', function (Blueprint $table) {
            $table->id();
            $table->string('username', 64)->default('')->index();
            $table->string('groupname', 64)->default('');
            $table->integer('priority')->default(1);
        });

        Schema::create('radacct', function (Blueprint $table) {
            $table->bigIncrements('radacctid');
            $table->string('acctsessionid', 64)->default('')->index();
            $table->string('acctuniqueid', 32)->default('')->unique();
            $table->string('username', 64)->default('')->index();
            $table->string('realm', 64)->nullable()->default('');
            $table->string('nasipaddress', 15)->default('')->index();
            $table->string('nasportid', 32)->nullable()->default('');
            $table->string('nasporttype', 32)->nullable()->default('');
            $table->timestamp('acctstarttime')->nullable()->index();
            $table->timestamp('acctupdatetime')->nullable();
            $table->timestamp('acctstoptime')->nullable()->index();
            $table->integer('acctinterval')->nullable();
            $table->bigInteger('acctsessiontime')->nullable()->unsigned()->default(0);
            $table->string('acctauthentic', 32)->nullable()->default('');
            $table->string('connectinfo_start', 50)->nullable()->default('');
            $table->string('connectinfo_stop', 50)->nullable()->default('');
            $table->bigInteger('acctinputoctets')->nullable()->default(0);
            $table->bigInteger('acctoutputoctets')->nullable()->default(0);
            $table->string('calledstationid', 50)->default('');
            $table->string('callingstationid', 50)->default('')->index();
            $table->string('acctterminatecause', 32)->default('');
            $table->string('servicetype', 32)->nullable()->default('');
            $table->string('framedprotocol', 32)->nullable()->default('');
            $table->string('framedipaddress', 15)->default('')->index();
            $table->string('framedipv6address', 45)->default('');
            $table->string('framedipv6prefix', 45)->default('');
            $table->string('framedinterfaceid', 44)->default('');
            $table->string('delegatedipv6prefix', 45)->default('');
        });

        Schema::create('radnas', function (Blueprint $table) {
            $table->id();
            $table->string('nasname', 128)->index();
            $table->string('shortname', 32)->nullable();
            $table->string('type', 30)->default('other');
            $table->integer('ports')->nullable();
            $table->string('secret', 60)->default('secret');
            $table->string('server', 64)->nullable();
            $table->string('community', 50)->nullable();
            $table->string('description', 200)->nullable()->default('RADIUS Client');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radnas');
        Schema::dropIfExists('radacct');
        Schema::dropIfExists('radusergroup');
        Schema::dropIfExists('radgroupreply');
        Schema::dropIfExists('radgroupcheck');
        Schema::dropIfExists('radreply');
        Schema::dropIfExists('radcheck');
    }
};
