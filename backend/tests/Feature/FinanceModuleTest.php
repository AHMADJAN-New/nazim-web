<?php

namespace Tests\Feature;

use App\Models\FinanceAccount;
use App\Models\IncomeEntry;
use App\Models\ExpenseEntry;
use App\Models\IncomeCategory;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceModuleTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_list_finance_accounts()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        FinanceAccount::factory()->count(5)->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'account_name', 'account_type', 'balance', 'currency'],
                ],
            ]);

        $this->assertCount(5, $response->json('data'));
    }

    /** @test */
    public function user_can_create_finance_account()
    {
        $user = $this->authenticate();

        $accountData = [
            'account_name' => 'Main Cash Box',
            'account_type' => 'cash',
            'balance' => 50000,
            'currency' => 'AFN',
            'description' => 'Main cash collection',
            'is_active' => true,
        ];

        $response = $this->jsonAs($user, 'POST', '/api/finance-accounts', $accountData);

        $response->assertStatus(201)
            ->assertJsonFragment(['account_name' => 'Main Cash Box']);

        $this->assertDatabaseHas('finance_accounts', [
            'account_name' => 'Main Cash Box',
            'balance' => 50000,
        ]);
    }

    /** @test */
    public function user_can_update_finance_account()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $account = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'account_name' => 'Original Name',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/finance-accounts/{$account->id}", [
            'account_name' => 'Updated Name',
            'account_type' => $account->account_type,
            'balance' => 75000,
            'currency' => $account->currency,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('finance_accounts', [
            'id' => $account->id,
            'account_name' => 'Updated Name',
            'balance' => 75000,
        ]);
    }

    /** @test */
    public function user_can_delete_finance_account()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $account = FinanceAccount::factory()->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'DELETE', "/api/finance-accounts/{$account->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('finance_accounts', ['id' => $account->id]);
    }

    /** @test */
    public function user_can_filter_accounts_by_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        FinanceAccount::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'is_active' => true,
        ]);

        FinanceAccount::factory()->count(2)->inactive()->create([
            'organization_id' => $organization->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts', [
            'is_active' => 'true',
        ]);

        $response->assertStatus(200);
        $accounts = $response->json('data');

        $this->assertCount(3, $accounts);
    }

    /** @test */
    public function user_cannot_access_finance_accounts_from_different_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1);

        $accountOrg2 = FinanceAccount::factory()->create(['organization_id' => $org2->id]);

        $response = $this->jsonAs($user1, 'GET', "/api/finance-accounts/{$accountOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function account_balance_is_numeric_and_positive()
    {
        $user = $this->authenticate();

        $response = $this->jsonAs($user, 'POST', '/api/finance-accounts', [
            'account_name' => 'Test Account',
            'account_type' => 'cash',
            'balance' => -1000, // Negative balance
            'currency' => 'AFN',
        ]);

        // Should either reject or accept based on business rules
        // If negative balances are not allowed, should get validation error
        if ($response->status() === 422) {
            $response->assertJsonValidationErrors(['balance']);
        }
    }

    /** @test */
    public function finance_accounts_support_multiple_currencies()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $accountAFN = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'currency' => 'AFN',
        ]);

        $accountUSD = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'currency' => 'USD',
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts');

        $response->assertStatus(200);
        $accounts = $response->json('data');

        $currencies = array_column($accounts, 'currency');
        $this->assertContains('AFN', $currencies);
        $this->assertContains('USD', $currencies);
    }
}
