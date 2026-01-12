<?php

namespace Tests\Feature;

use App\Models\FinanceAccount;
use App\Models\IncomeEntry;
use App\Models\ExpenseEntry;
use App\Models\IncomeCategory;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\SchoolBranding;
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
        $school = $this->getUserSchool($user);

        FinanceAccount::factory()->count(5)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => ['id', 'name', 'type', 'current_balance', 'currency_id'],
            ]);

        $this->assertCount(5, $response->json());
    }

    /** @test */
    public function user_can_create_finance_account()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $currency = \App\Models\Currency::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $accountData = [
            'name' => 'Main Cash Box',
            'type' => 'cash',
            'opening_balance' => 50000,
            'currency_id' => $currency->id,
            'description' => 'Main cash collection',
            'is_active' => true,
        ];

        $response = $this->jsonAs($user, 'POST', '/api/finance-accounts', $accountData);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Main Cash Box']);

        $this->assertDatabaseHas('finance_accounts', [
            'name' => 'Main Cash Box',
            'opening_balance' => 50000,
        ]);
    }

    /** @test */
    public function user_can_update_finance_account()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $account = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Original Name',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/finance-accounts/{$account->id}", [
            'name' => 'Updated Name',
            'type' => $account->type,
            'opening_balance' => 75000,
            'currency_id' => $account->currency_id,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('finance_accounts', [
            'id' => $account->id,
            'name' => 'Updated Name',
            'opening_balance' => 75000,
        ]);
    }

    /** @test */
    public function user_can_delete_finance_account()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $account = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'DELETE', "/api/finance-accounts/{$account->id}");

        $response->assertStatus(204);

        $this->assertSoftDeleted('finance_accounts', ['id' => $account->id]);
    }

    /** @test */
    public function user_can_filter_accounts_by_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        FinanceAccount::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_active' => true,
        ]);

        FinanceAccount::factory()->count(2)->inactive()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts', [
            'is_active' => true,
        ]);

        $response->assertStatus(200);
        $accounts = $response->json();

        $this->assertCount(3, $accounts);
    }

    /** @test */
    public function user_cannot_access_finance_accounts_from_different_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $accountOrg2 = FinanceAccount::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => SchoolBranding::factory()->create(['organization_id' => $org2->id])->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', "/api/finance-accounts/{$accountOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function account_balance_is_numeric_and_positive()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $currency = \App\Models\Currency::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/finance-accounts', [
            'name' => 'Test Account',
            'type' => 'cash',
            'opening_balance' => -1000,
            'currency_id' => $currency->id,
        ]);

        $response->assertStatus(400);
        $this->assertArrayHasKey('opening_balance', $response->json('details'));
    }

    /** @test */
    public function finance_accounts_support_multiple_currencies()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $currencyAfn = \App\Models\Currency::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'code' => 'AFN',
        ]);
        $currencyUsd = \App\Models\Currency::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'code' => 'USD',
        ]);

        $accountAFN = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'currency_id' => $currencyAfn->id,
        ]);

        $accountUSD = FinanceAccount::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'currency_id' => $currencyUsd->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/finance-accounts');

        $response->assertStatus(200);
        $accounts = $response->json();

        $currencyCodes = array_map(function ($account) {
            return $account['currency']['code'] ?? null;
        }, $accounts);
        $this->assertContains('AFN', $currencyCodes);
        $this->assertContains('USD', $currencyCodes);
    }
}
