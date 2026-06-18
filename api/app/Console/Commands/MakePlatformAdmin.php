<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class MakePlatformAdmin extends Command
{
    protected $signature = 'hotbill:make-admin
        {email : Email of the platform admin}
        {--name= : Name (when creating a new user)}
        {--password= : Password (when creating a new user)}';

    protected $description = 'Create or promote a user to platform super-admin';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->update(['role' => 'super_admin', 'is_active' => true]);
            $this->info("Promoted {$email} to super_admin.");
            return self::SUCCESS;
        }

        $password = $this->option('password') ?: \Illuminate\Support\Str::random(14);
        $user = User::create([
            'tenant_id' => null,
            'name' => $this->option('name') ?: 'Platform Admin',
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->info("Created super-admin {$email}");
        if (!$this->option('password')) {
            $this->warn("Generated password: {$password}");
        }

        return self::SUCCESS;
    }
}
